import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookMarked, Save, ArrowLeft, Upload, X, Plus, Trash2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { LectureUnit } from '../types/quiz';
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

  // Lecture Units
  const [units, setUnits] = useState<LectureUnit[]>([]);

  // Modals for units/topics
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitId, setNewUnitId] = useState('');
  const [newUnitName, setNewUnitName] = useState('');

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [activeUnitForTopic, setActiveUnitForTopic] = useState<number | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const res = await api.get('/modules');
        const cModule = res.data.find((m: any) => m.id === Number(id));
        if (!cModule) throw new Error("Module not found");
        setName(cModule.name);
        setCode(cModule.code);
        setYear(cModule.year);
        setSemester(cModule.semester);
        setModulePhrase(cModule.module_phrase || '');
        setExistingCard(cModule.card_image_url);
        setExistingBanner(cModule.banner_image_url);

        api.get(`/modules/${id}/units-with-topics`).then(r => setUnits(r.data)).catch(console.error);
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

  const handleAddUnit = () => {
    setNewUnitId('');
    setNewUnitName('');
    setShowUnitModal(true);
  };

  const submitAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitId || !newUnitName) return;
    try {
        const res = await api.post(`/modules/${id}/units`, { unit_identifier: newUnitId, name: newUnitName });
        setUnits([...units, { ...res.data, topics: [] }]);
        setShowUnitModal(false);
    } catch(err) {
        alert("Failed to add unit");
    }
  };

  const handleDeleteUnit = async (uId: number) => {
      if(!confirm("Delete unit and all its topics?")) return;
      await api.delete(`/modules/units/${uId}`);
      setUnits(units.filter(u => u.id !== uId));
  };

  const handleAddTopic = (uId: number) => {
      setActiveUnitForTopic(uId);
      setNewTopicName('');
      setShowTopicModal(true);
  };

  const submitAddTopic = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newTopicName || !activeUnitForTopic) return;
      try {
          const res = await api.post(`/modules/units/${activeUnitForTopic}/topics`, { name: newTopicName });
          setUnits(units.map(u => u.id === activeUnitForTopic ? { ...u, topics: [...u.topics, res.data] } : u));
          setShowTopicModal(false);
          setActiveUnitForTopic(null);
      } catch(err) {
          alert("Failed to add topic");
      }
  };

  const handleDeleteTopic = async (uId: number, tId: number) => {
      if(!confirm("Are you sure? This will permanently wipe this topic securely from all questions containing it!")) return;
      await api.delete(`/modules/topics/${tId}`);
      setUnits(units.map(u => u.id === uId ? { ...u, topics: u.topics.filter(t => t.id !== tId) } : u));
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

        {/* --- LECTURE UNITS --- */}
        <div className="module-section" style={{ marginTop: '2rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem' }}>
              <h2 className="text-title">Lecture Units &amp; Topics</h2>
              <button onClick={handleAddUnit} className="btn-ghost-gold"><Plus size={16}/> Add Unit</button>
           </div>
           
           {units.length === 0 ? (
              <p className="text-desc" style={{ fontStyle: 'italic', textAlign: 'center' }}>No units established yet.</p>
           ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {units.map((u) => (
                    <div key={u.id} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', borderRadius: '8px', padding: '1rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{u.unit_identifier}: {u.name}</span>
                          <button onClick={() => handleDeleteUnit(u.id)} className="btn-ghost" style={{ color: 'var(--accent-red)' }}><Trash2 size={16}/></button>
                       </div>
                       
                       <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border-dark)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {u.topics.map(t => (
                             <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                                <span className="text-desc">{t.name}</span>
                                <button onClick={() => handleDeleteTopic(u.id, t.id)} className="btn-ghost-danger" style={{ padding: '0.2rem' }}><X size={14}/></button>
                             </div>
                          ))}
                          <button onClick={() => handleAddTopic(u.id)} className="btn-ghost" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', marginTop: '0.5rem' }}><Plus size={14}/> Add Topic</button>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>

      {showUnitModal && (
        <div className="modal-overlay" onClick={() => setShowUnitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowUnitModal(false)}>✕</button>
            <h2 className="brand-font" style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Forge Unit</h2>
            <form onSubmit={submitAddUnit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                 <label className="text-desc" style={{display:'block'}}>Unit Identifier</label>
                 <input type="text" className="auth-input" placeholder="e.g. Unit 1" value={newUnitId} onChange={e => setNewUnitId(e.target.value)} required />
              </div>
              <div>
                 <label className="text-desc" style={{display:'block'}}>Unit Name</label>
                 <input type="text" className="auth-input" placeholder="e.g. Kinematics" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} required />
              </div>
              <button type="submit" className="btn-solid-gold" style={{marginTop: '0.5rem', justifyContent: 'center'}}>Add Unit</button>
            </form>
          </div>
        </div>
      )}

      {showTopicModal && (
        <div className="modal-overlay" onClick={() => setShowTopicModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowTopicModal(false)}>✕</button>
            <h2 className="brand-font" style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Forge Topic</h2>
            <form onSubmit={submitAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                 <label className="text-desc" style={{display:'block'}}>Topic Name</label>
                 <input type="text" className="auth-input" placeholder="e.g. Velocity Vectors" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} required />
              </div>
              <button type="submit" className="btn-solid-gold" style={{marginTop: '0.5rem', justifyContent: 'center'}}>Add Topic</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EditModule;
