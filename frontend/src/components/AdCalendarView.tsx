import { useState } from 'react';
import { ChevronLeft, ChevronRight, BarChart2, X } from 'lucide-react';

export const AdCalendarView = ({ campaigns, onCancelCampaign }: { campaigns: any[], onCancelCampaign: (id: number) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [placementFilter, setPlacementFilter] = useState('all');
  const [selectedAd, setSelectedAd] = useState<any>(null);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => i);

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const filteredCampaigns = campaigns.filter(c => placementFilter === 'all' || c.placement === placementFilter);

  const getCampaignsForDate = (date: number) => {
    const targetDate = new Date(year, month, date);
    return filteredCampaigns.filter(c => {
      const start = new Date(c.start_date);
      const end = c.end_date ? new Date(c.end_date) : null;
      start.setHours(0, 0, 0, 0);
      const target = targetDate.getTime();
      if (end) {
        end.setHours(23, 59, 59, 999);
        return target >= start.getTime() && target <= end.getTime();
      }
      return target >= start.getTime(); // Open ended
    });
  };

  const getPlacementColor = (placement: string) => {
    switch (placement) {
      case 'top_banner': return '#e74c3c';
      case 'bottom_banner': return '#3498db';
      case 'left_nav': return '#9b59b6';
      case 'right_nav': return '#f1c40f';
      default: return '#2ecc71';
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={prevMonth} className="btn-ghost" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
          <h4 style={{ margin: 0, minWidth: '150px', textAlign: 'center', color: 'var(--accent-gold)' }}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h4>
          <button onClick={nextMonth} className="btn-ghost" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
        </div>
        <div>
          <select className="auth-input" style={{ margin: 0, padding: '0.4rem', width: 'auto' }} value={placementFilter} onChange={e => setPlacementFilter(e.target.value)}>
            <option value="all">All Placements</option>
            <option value="top_banner">Top Banner</option>
            <option value="bottom_banner">Bottom Banner</option>
            <option value="left_nav">Left Nav</option>
            <option value="right_nav">Right Nav</option>
          </select>
        </div>
      </div>

      <div className="ad-calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="ad-calendar-header">{day}</div>
        ))}
        {padding.map((_, i) => (
          <div key={`pad-${i}`} className="ad-calendar-cell empty"></div>
        ))}
        {days.map(date => {
          const dayCampaigns = getCampaignsForDate(date);
          const isToday = new Date().toDateString() === new Date(year, month, date).toDateString();
          return (
            <div key={date} className={`ad-calendar-cell ${isToday ? 'today' : ''}`}>
              <div className="ad-calendar-date">{date}</div>
              <div className="ad-calendar-events">
                {dayCampaigns.map((c, i) => (
                  <div
                    key={`${c.id}-${i}`}
                    className="ad-calendar-event"
                    style={{ backgroundColor: getPlacementColor(c.placement) }}
                    onClick={() => setSelectedAd(c)}
                  >
                    {c.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Details Modal */}
      {selectedAd && (
        <div className="modal-overlay" onClick={() => setSelectedAd(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setSelectedAd(null)}><X size={24} /></button>
            <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>{selectedAd.title}</h2>

            {selectedAd.light_image_url && (
              <img src={selectedAd.light_image_url} alt={selectedAd.title} style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginBottom: '1rem', borderRadius: '8px', background: 'var(--bg-deep)' }} />
            )}

            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}><strong>Placement:</strong> {selectedAd.placement?.replace(/_/g, ' ').toUpperCase()}</p>
            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}><strong>Semester:</strong> {selectedAd.target_semester || 'Global'}</p>
            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}><strong>Start:</strong> {new Date(selectedAd.start_date).toLocaleDateString()}</p>
            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}><strong>End:</strong> {selectedAd.end_date ? new Date(selectedAd.end_date).toLocaleDateString() : 'Open-ended'}</p>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><BarChart2 size={16} /> <strong>Clicks:</strong> {selectedAd.click_count ?? 0}</p>

            {selectedAd.is_active && (
              <button onClick={() => { onCancelCampaign(selectedAd.id); setSelectedAd(null); }} className="btn-ghost" style={{ width: '100%', color: '#e74c3c', borderColor: '#e74c3c' }}>
                Terminate Campaign
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
