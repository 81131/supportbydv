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
  const [modulePhrase, setModulePhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Card
  const [existingCard, setExistingCard] = useState<string | null>(null);
  const [cardImageSrc, setCardImageSrc] = useState<string | null>(null);
  const [cropCard, setCropCard] = useState({ x: 0, y: 0 });
  const [zoomCard, setZoomCard] = useState(1);
  const [croppedCardPixels, setCroppedCardPixels] = useState<any>(null);
  const [croppedCardFile, setCroppedCardFile] = useState<File | null>(null);
  const [showCardCropper, setShowCardCropper] = useState(false);

  // Banner
  const [existingBanner, setExistingBanner] = useState<string | null>(null);
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);
  const [cropBanner, setCropBanner] = useState({ x: 0, y: 0 });
  const [zoomBanner, setZoomBanner] = useState(1);
  const [croppedBannerPixels, setCroppedBannerPixels] = useState<any>(null);
  const [croppedBannerFile, setCroppedBannerFile] = useState<File | null>(null);
  const [showBannerCropper, setShowBannerCropper] = useState(false);

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
        setModulePhrase(cModule.module_phrase || '');
        setExistingCard(cModule.card_image_url);
        setExistingBanner(cModule.banner_image_url);
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

  const onCardCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedCardPixels(croppedAreaPixels);
  }, []);

  const onBannerCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedBannerPixels(croppedAreaPixels);
  }, []);

  const handleCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCardImageSrc(reader.result?.toString() || null);
        setShowCardCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setBannerImageSrc(reader.result?.toString() || null);
        setShowBannerCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const confirmCardCrop = async () => {
    try {
      if (!cardImageSrc || !croppedCardPixels) return;
      const croppedImage = await getCroppedImg(cardImageSrc, croppedCardPixels);
      setCroppedCardFile(croppedImage);
      setCardImageSrc(URL.createObjectURL(croppedImage)); // update preview
      setShowCardCropper(false);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmBannerCrop = async () => {
    try {
      if (!bannerImageSrc || !croppedBannerPixels) return;
      const croppedImage = await getCroppedImg(bannerImageSrc, croppedBannerPixels);
      setCroppedBannerFile(croppedImage);
      setBannerImageSrc(URL.createObjectURL(croppedImage)); // update preview
      setShowBannerCropper(false);
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
      if (modulePhrase) formData.append('module_phrase', modulePhrase);
      if (croppedCardFile) formData.append('card_image', croppedCardFile);
      if (croppedBannerFile) formData.append('banner_image', croppedBannerFile);

      await api.put(`/modules/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Module successfully revised.');
      window.location.href = `/module/${id}`;
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

          <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Name</label>
              <input type="text" className="auth-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Code</label>
              <input type="text" className="auth-input" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>

            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Catchy Phrase (Optional)</label>
              <input type="text" className="auth-input" value={modulePhrase} onChange={(e) => setModulePhrase(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Year</label>
                <input type="number" className="auth-input" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Semester</label>
                <input type="number" className="auth-input" value={semester} onChange={(e) => setSemester(Number(e.target.value))} />
              </div>
            </div>

            {/* CARD IMAGE */}
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Card Image (1:1)</label>
              {!showCardCropper && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {existingCard && !croppedCardFile && (
                    <img src={`${API_BASE_URL}${existingCard}`} alt="Current preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  {croppedCardFile && (
                    <img src={cardImageSrc as string} alt="Cropped preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Choose Image
                    <input type="file" accept="image/*" onChange={handleCardFileChange} style={{ display: 'none' }} />
                  </label>
                  {croppedCardFile && (
                    <button type="button" onClick={() => { setCroppedCardFile(null); setCardImageSrc(null); setExistingCard(null); }} className="btn-ghost" style={{ color: 'red' }}><X size={16} /></button>
                  )}
                </div>
              )}
              {showCardCropper && cardImageSrc && (
                <div style={{ position: 'relative', width: '100%', height: 300, background: '#333', marginTop: '1rem', borderRadius: 8, overflow: 'hidden' }}>
                  <Cropper image={cardImageSrc} crop={cropCard} zoom={zoomCard} aspect={1} onCropChange={setCropCard} onCropComplete={onCardCropComplete} onZoomChange={setZoomCard} />
                  <button type="button" onClick={confirmCardCrop} className="btn-solid-gold" style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10 }}>Confirm Crop</button>
                </div>
              )}
            </div>

            {/* BANNER IMAGE */}
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Banner Image (16:9)</label>
              {!showBannerCropper && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {existingBanner && !croppedBannerFile && (
                    <img src={`${API_BASE_URL}${existingBanner}`} alt="Current preview" style={{ width: 160, height: 90, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  {croppedBannerFile && (
                    <img src={bannerImageSrc as string} alt="Cropped preview" style={{ width: 160, height: 90, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Choose Image
                    <input type="file" accept="image/*" onChange={handleBannerFileChange} style={{ display: 'none' }} />
                  </label>
                  {croppedBannerFile && (
                    <button type="button" onClick={() => { setCroppedBannerFile(null); setBannerImageSrc(null); setExistingBanner(null); }} className="btn-ghost" style={{ color: 'red' }}><X size={16} /></button>
                  )}
                </div>
              )}
              {showBannerCropper && bannerImageSrc && (
                <div style={{ position: 'relative', width: '100%', height: 300, background: '#333', marginTop: '1rem', borderRadius: 8, overflow: 'hidden' }}>
                  <Cropper image={bannerImageSrc} crop={cropBanner} zoom={zoomBanner} aspect={16 / 9} onCropChange={setCropBanner} onCropComplete={onBannerCropComplete} onZoomChange={setZoomBanner} />
                  <button type="button" onClick={confirmBannerCrop} className="btn-solid-gold" style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10 }}>Confirm Crop</button>
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
