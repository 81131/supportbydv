import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookMarked, Save, ArrowLeft, Upload, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import api, { API_BASE_URL } from '../api';
import { getCroppedImg } from '../utils/cropImage';

const EditModule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const res = await api.get('/modules/');
        const cModule = res.data.find((m: any) => m.id === Number(id));
        if (!cModule) throw new Error("Module not found");
        setName(cModule.name);
        setCode(cModule.code);
        setYear(cModule.year);
        setSemester(cModule.semester);
        setExistingImage(cModule.image_url);
      } catch (e) {
        console.error(e);
        alert("Failed to load module details.");
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchModule();
  }, [id, navigate]);

  const onCropComplete = useCallback((croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const showCroppedImage = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImageFile(croppedImage);
      setImageSrc(URL.createObjectURL(croppedImage));
      setShowCropper(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      alert('Please provide a module name and code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('code', code);
      formData.append('year', year.toString());
      formData.append('semester', semester.toString());
      if (croppedImageFile) {
        formData.append('file', croppedImageFile);
      }

      await api.put(`/modules/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Module successfully revised.');
      window.location.href = `/module/${id}`; // Force full reload to update nav context
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to revise module.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="page-container text-title" style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--accent-gold)' }}>Consulting the archives... ⏳</div>;

  return (
    <div className="page-container">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={20} /> Back
        </button>

        <div className="module-section">
          <h1 className="brand-font" style={{ textAlign: 'center', color: 'var(--accent-gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <BookMarked size={32} /> Revise Module
          </h1>

          <p className="text-desc" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Adjust the nature of the path of study.
          </p>

          <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Name</label>
              <input
                type="text"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Operating System & System Administration"
                autoFocus
              />
            </div>

            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Code</label>
              <input
                type="text"
                className="auth-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., OSSA, WMT, PS"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Year</label>
                <input
                  type="number"
                  className="auth-input"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Semester</label>
                <input
                  type="number"
                  className="auth-input"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Image (1:1)</label>
              {!showCropper && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {existingImage && !croppedImageFile && (
                    <img src={`${API_BASE_URL}${existingImage}`} alt="Current preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  {croppedImageFile && (
                    <img src={imageSrc as string} alt="Cropped preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  )}

                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> {existingImage || croppedImageFile ? 'Change Image' : 'Choose Image'}
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>

                  {croppedImageFile && (
                    <button type="button" onClick={() => { setCroppedImageFile(null); setImageSrc(null); setExistingImage(null); }} className="btn-ghost" style={{ color: 'red' }}><X size={16} /></button>
                  )}
                </div>
              )}
              {showCropper && imageSrc && (
                <div style={{ position: 'relative', width: '100%', height: 300, background: '#333', marginTop: '1rem', borderRadius: 8, overflow: 'hidden' }}>
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                  <button type="button" onClick={showCroppedImage} className="btn-solid-gold" style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10 }}>Confirm Crop</button>
                </div>
              )}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-solid-gold" style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center', opacity: isSubmitting ? 0.5 : 1, marginTop: '1rem' }}>
              <Save size={20} /> {isSubmitting ? 'Revising...' : 'Save Revisions'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditModule;
