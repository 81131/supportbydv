import toast from 'react-hot-toast';
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Save, ArrowLeft, Upload, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import api from '../api';
import { getCroppedImg } from '../utils/cropImage';

const CreateModule: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [modulePhrase, setModulePhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Card Image State
  const [cardImageSrc, setCardImageSrc] = useState<string | null>(null);
  const [cropCard, setCropCard] = useState({ x: 0, y: 0 });
  const [zoomCard, setZoomCard] = useState(1);
  const [croppedCardPixels, setCroppedCardPixels] = useState<any>(null);
  const [croppedCardFile, setCroppedCardFile] = useState<File | null>(null);
  const [showCardCropper, setShowCardCropper] = useState(false);

  // Banner Image State
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);
  const [cropBanner, setCropBanner] = useState({ x: 0, y: 0 });
  const [zoomBanner, setZoomBanner] = useState(1);
  const [croppedBannerPixels, setCroppedBannerPixels] = useState<any>(null);
  const [croppedBannerFile, setCroppedBannerFile] = useState<File | null>(null);
  const [showBannerCropper, setShowBannerCropper] = useState(false);

  // Fix: The arguments of onCropComplete from react-easy-crop are (croppedArea, croppedAreaPixels)
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast.error('Please provide a module name and code.');
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

      await api.post('/modules', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Module successfully forged.');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to forge module.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={20} /> Back
        </button>

        <div className="module-section">
          <h1 className="brand-font" style={{ textAlign: 'center', color: 'var(--accent-gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <BookMarked size={32} /> Forge a New Module
          </h1>

          <p className="text-desc" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Only the Small Council possesses the power to decree new paths of study.
          </p>

          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Name</label>
              <input type="text" className="auth-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Operating System & System Administration" autoFocus />
            </div>

            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Code</label>
              <input type="text" className="auth-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., OSSA, WMT, PS" />
            </div>
            
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Catchy Phrase (Optional)</label>
              <input type="text" className="auth-input" value={modulePhrase} onChange={(e) => setModulePhrase(e.target.value)} placeholder="e.g., A LANister always pings his local network." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Year</label>
                <input type="number" className="auth-input" value={year} onChange={(e) => setYear(Number(e.target.value))} min="1" max="10" />
              </div>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Semester</label>
                <input type="number" className="auth-input" value={semester} onChange={(e) => setSemester(Number(e.target.value))} min="1" max="10" />
              </div>
            </div>

            {/* CARD IMAGE */}
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Card Image (Optional, 1:1)</label>
              {!showCardCropper && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Choose Image
                    <input type="file" accept="image/*" onChange={handleCardFileChange} style={{ display: 'none' }} />
                  </label>
                  {croppedCardFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img src={cardImageSrc as string} alt="Cropped preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                      <button type="button" onClick={() => { setCroppedCardFile(null); setCardImageSrc(null); }} className="btn-ghost" style={{ color: 'red' }}><X size={16} /></button>
                    </div>
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
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Banner Image (Optional, 16:9)</label>
              {!showBannerCropper && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Choose Image
                    <input type="file" accept="image/*" onChange={handleBannerFileChange} style={{ display: 'none' }} />
                  </label>
                  {croppedBannerFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img src={bannerImageSrc as string} alt="Cropped preview" style={{ width: 160, height: 90, borderRadius: 8, objectFit: 'cover' }} />
                      <button type="button" onClick={() => { setCroppedBannerFile(null); setBannerImageSrc(null); }} className="btn-ghost" style={{ color: 'red' }}><X size={16} /></button>
                    </div>
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
              <Save size={20} /> {isSubmitting ? 'Forging...' : 'Forge Module'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateModule;
