import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import jsPDF from 'jspdf';
import { Upload, RefreshCw, Save, Wand2, AlignCenter, LayoutList } from 'lucide-react';
import api from '../api';
import getCroppedImg from '../utils/cropImage';

const calculateIdealZoom = (imgWidth: number, imgHeight: number, rotation: number, cropAspect: number) => {
  let activeW = imgWidth; let activeH = imgHeight;
  if (rotation === 90 || rotation === 270) { activeW = imgHeight; activeH = imgWidth; }
  const imgAspect = activeW / activeH;
  let idealZoom = imgAspect > cropAspect ? cropAspect / imgAspect : imgAspect / cropAspect;
  return idealZoom * 0.98;
};

const NoteUploader: React.FC = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<number | ''>('');
  
  const [uploadMode, setUploadMode] = useState<'idle' | 'direct' | 'edit'>('idle');
  const [directFile, setDirectFile] = useState<File | null>(null);
  
  const [images, setImages] = useState<{ url: string; file: File }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [applyZoomToAll, setApplyZoomToAll] = useState(false);
  
  const [zooms, setZooms] = useState<number[]>([]); 
  const [rotations, setRotations] = useState<number[]>([]);
  const [aspectRatios, setAspectRatios] = useState<number[]>([]);
  const [crops, setCrops] = useState<{ x: number; y: number }[]>([]); 
  const [croppedAreas, setCroppedAreas] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    if (files.length > 20) { alert("Max 20 images at a time."); e.target.value = ''; return; }

    const isImages = files.every(f => f.type.startsWith('image/'));

    if (isImages) {
      setIsProcessing(true);
      const imageUrls = files.map(file => ({ url: URL.createObjectURL(file), file }));
      
      const len = files.length;
      const initialZooms = [];
      const defaultAspect = 1 / 1.414;

      for (let imgObj of imageUrls) {
        const img = new Image(); img.src = imgObj.url;
        await new Promise(resolve => { img.onload = resolve; });
        initialZooms.push(calculateIdealZoom(img.naturalWidth, img.naturalHeight, 0, defaultAspect));
      }

      setImages(imageUrls);
      setRotations(new Array(len).fill(0));
      setAspectRatios(new Array(len).fill(defaultAspect));
      setZooms(initialZooms);
      setCrops(new Array(len).fill({ x: 0, y: 0 })); 
      setCroppedAreas(new Array(len).fill(null));
      setUploadMode('edit');
      setCurrentIndex(0);
      setIsProcessing(false);
    } else {
      setDirectFile(files[0]);
      setUploadMode('direct');
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const reorder = (arr: any[]) => {
      const res = [...arr];
      const [removed] = res.splice(dragIndex, 1);
      res.splice(dropIndex, 0, removed); return res;
    };

    setImages(reorder(images)); setRotations(reorder(rotations));
    setAspectRatios(reorder(aspectRatios)); setZooms(reorder(zooms));
    setCrops(reorder(crops)); setCroppedAreas(reorder(croppedAreas));
    setCurrentIndex(dropIndex);
  };

  const deleteImage = (indexToDelete: number) => {
    if (images.length === 1) { setImages([]); setUploadMode('idle'); return; }
    setImages(prev => prev.filter((_, i) => i !== indexToDelete));
    setRotations(prev => prev.filter((_, i) => i !== indexToDelete));
    setAspectRatios(prev => prev.filter((_, i) => i !== indexToDelete));
    setZooms(prev => prev.filter((_, i) => i !== indexToDelete));
    setCrops(prev => prev.filter((_, i) => i !== indexToDelete));
    setCroppedAreas(prev => prev.filter((_, i) => i !== indexToDelete));
    if (currentIndex >= images.length - 1) setCurrentIndex(images.length - 2);
  };

  const centerCurrent = () => setCrops(prev => { const n = [...prev]; n[currentIndex] = { x: 0, y: 0 }; return n; });
  const centerAll = () => setCrops(new Array(images.length).fill({ x: 0, y: 0 }));

  const handleAutoFormat = async () => {
    setIsProcessing(true);
    const newRots = [...rotations]; const newAspects = [...aspectRatios];
    const newZooms = [...zooms]; const newCrops = [...crops];
    const targetAspect = 1 / 1.414; 

    for (let i = 0; i < images.length; i++) {
      const img = new Image(); img.src = images[i].url;
      await new Promise(resolve => { img.onload = resolve; });
      const isLandscape = img.naturalWidth > img.naturalHeight;
      newRots[i] = isLandscape ? 90 : 0;
      newAspects[i] = targetAspect;
      newZooms[i] = calculateIdealZoom(img.naturalWidth, img.naturalHeight, newRots[i], targetAspect);
      newCrops[i] = { x: 0, y: 0 }; 
    }
    setRotations(newRots); setAspectRatios(newAspects); setZooms(newZooms); setCrops(newCrops);
    setIsProcessing(false);
  };

  const updateAspectRatio = async (val: number) => {
    setAspectRatios(prev => { const n = [...prev]; n[currentIndex] = val; return n; });
    const img = new Image(); img.src = images[currentIndex].url;
    await new Promise(resolve => { img.onload = resolve; });
    const idealZoom = calculateIdealZoom(img.naturalWidth, img.naturalHeight, rotations[currentIndex], val);
    setZooms(prev => { const n = [...prev]; n[currentIndex] = idealZoom; return n; });
    setCrops(prev => { const n = [...prev]; n[currentIndex] = { x: 0, y: 0 }; return n; });
  };

  const executeUpload = async () => {
    if (!title || !moduleId) { alert("A title and module are required."); return; }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('module_id', moduleId.toString());

    try {
      if (uploadMode === 'direct' && directFile) {
        formData.append('file', directFile);
      } else if (uploadMode === 'edit') {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < images.length; i++) {
          const croppedDataUrl = await getCroppedImg(images[i].url, croppedAreas[i], rotations[i]);
          if (i > 0) pdf.addPage();
          
          const imgProps = pdf.getImageProperties(croppedDataUrl);
          const imgRatio = imgProps.width / imgProps.height;
          const pageRatio = pdfWidth / pdfHeight;

          let renderWidth = pdfWidth; let renderHeight = pdfHeight;
          if (imgRatio > pageRatio) renderHeight = pdfWidth / imgRatio;
          else renderWidth = pdfHeight * imgRatio;

          pdf.addImage(croppedDataUrl, 'JPEG', (pdfWidth - renderWidth) / 2, (pdfHeight - renderHeight) / 2, renderWidth, renderHeight);
        }
        const pdfBlob = pdf.output('blob');
        const compiledFile = new File([pdfBlob], `${title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
        formData.append('file', compiledFile);
      }

      await api.post('/library/notes', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert("Scroll forged and added to the archives!");
      navigate('/'); 
    } catch (error) { alert("The Maesters rejected your upload. Try again."); } 
    finally { setIsUploading(false); }
  };

  return (
    <div className="page-container">
      <div className="module-section">
        
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Upload size={32} /> The Maester's Forge
        </h1>

        <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Scroll Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="auth-input" placeholder="e.g., Week 3 Lecture Notes" />
          </div>
          <div>
            <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="auth-input" placeholder="Brief summary of the contents..." />
          </div>
          <div>
            <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Module *</label>
            <select value={moduleId} onChange={e => setModuleId(Number(e.target.value))} className="auth-input" style={{ width: '100%' }}>
              <option value="" disabled>Choose a module...</option>
              <option value={1}>Operating Systems (OSSA)</option>
              <option value={2}>Web & Mobile Tech (WMT)</option>
              <option value={3}>Professional Skills (PS)</option>
            </select>
          </div>
          <div>
            <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Attach Files (PDF, DOCX, JPG, PNG)</label>
            <input type="file" multiple accept=".pdf,.doc,.docx,.odt,image/png,image/jpeg,image/jpg" onChange={handleFileChange} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>

        {isProcessing && <p style={{ color: 'var(--accent-gold)', textAlign: 'center' }}>Calculating perfect dimensions... ⏳</p>}

        {uploadMode === 'edit' && images.length > 0 && !isProcessing && (
          <div style={{ borderTop: '1px dashed var(--border-dark)', paddingTop: '2rem', marginBottom: '2rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
               <button onClick={handleAutoFormat} className="btn-solid-gold" style={{ fontSize: '1.1rem', padding: '0.8rem 1.5rem' }}>
                <Wand2 size={20} /> Magic Auto-Format All Pages
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <LayoutList size={18} /> <span style={{ fontSize: '0.9rem' }}>Drag to rearrange pages</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {images.map((img, i) => (
                  <div key={img.url} style={{ position: 'relative' }}>
                    <div
                      draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', i.toString())}
                      onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, i)} onClick={() => setCurrentIndex(i)}
                      style={{
                        width: '70px', height: '90px', flexShrink: 0, cursor: 'grab',
                        border: currentIndex === i ? '3px solid var(--accent-gold)' : '1px solid var(--border-dark)', opacity: currentIndex === i ? 1 : 0.6,
                        backgroundImage: `url(${img.url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '4px'
                      }}
                    />
                    <button onClick={(e) => { e.stopPropagation(); deleteImage(i); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-red)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="control-bar" style={{ marginBottom: '1rem', alignItems: 'flex-end', background: 'transparent' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.2rem' }}>Page Format</label>
                <select value={aspectRatios[currentIndex]} onChange={(e) => updateAspectRatio(Number(e.target.value))} className="auth-input" style={{ padding: '0.4rem', margin: 0 }}>
                  <option value={1 / 1.414}>A4 Portrait</option>
                  <option value={1.414}>A4 Landscape</option>
                  <option value={1}>Perfect Square</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={centerCurrent} className="btn-ghost"><AlignCenter size={16} /> Center Current</button>
                <button onClick={centerAll} className="btn-ghost"><AlignCenter size={16} /> Center All</button>
              </div>
            </div>

            <div style={{ position: 'relative', width: '100%', height: '400px', backgroundColor: 'var(--bg-deep)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-dark)' }}>
              {images.map((img, i) => (
                <div key={img.url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: i === currentIndex ? 1 : 0, pointerEvents: i === currentIndex ? 'auto' : 'none', zIndex: i === currentIndex ? 10 : 1 }}>
                  <Cropper
                    image={img.url} crop={crops[i] || { x: 0, y: 0 }} zoom={zooms[i] || 1} rotation={rotations[i] || 0} aspect={aspectRatios[i] || (1 / 1.414)}
                    restrictPosition={false} minZoom={0.05} 
                    onCropChange={(c) => { if (i === currentIndex) setCrops(prev => { const n = [...prev]; n[i] = c; return n; }) }} 
                    onZoomChange={(z) => { if (i === currentIndex) { if (applyZoomToAll) setZooms(prev => prev.map(() => z)); else setZooms(prev => { const n = [...prev]; n[i] = z; return n; }); } }} 
                    onCropComplete={(_area, pixels) => setCroppedAreas(prev => { const n = [...prev]; n[i] = pixels; return n; })}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span className="text-desc" style={{ fontWeight: 'bold' }}>Zoom:</span>
                <input type="range" value={zooms[currentIndex]} min={0.05} max={3} step={0.05} onChange={(e) => {
                  const val = Number(e.target.value);
                  if (applyZoomToAll) setZooms(prev => prev.map(() => val));
                  else setZooms(prev => { const n = [...prev]; n[currentIndex] = val; return n; });
                }} style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-gold)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-dark)', paddingLeft: '1rem' }}>
                  <input type="checkbox" id="zoomAll" checked={applyZoomToAll} onChange={(e) => setApplyZoomToAll(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }} />
                  <label htmlFor="zoomAll" className="text-desc" style={{ cursor: 'pointer' }}>Apply zoom to all</label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-dark)', paddingTop: '1rem' }}>
                <button onClick={() => setRotations(prev => { const n = [...prev]; n[currentIndex] = (n[currentIndex] + 90) % 360; return n; })} className="btn-ghost"><RefreshCw size={16} /> Rotate Current</button>
                <button onClick={() => setRotations(prev => prev.map(r => (r + 90) % 360))} className="btn-ghost-gold"><RefreshCw size={16} /> Rotate All</button>
              </div>
            </div>
          </div>
        )}

        {(uploadMode === 'direct' || uploadMode === 'edit') && (
          <button onClick={executeUpload} disabled={isUploading} className={isUploading ? "btn-ghost" : "btn-solid-gold"} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}>
            {isUploading ? 'Forging Scroll...' : <><Save size={20} /> Compile & Upload Archive</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default NoteUploader;