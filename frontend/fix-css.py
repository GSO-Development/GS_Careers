import re
file_path = 'c:/xampp/htdocs/gs-Job/frontend/src/pages/admin/TalentPool.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_css = """
                .manage-vacancies-console {
                    animation: fadeIn 0.4s ease-out;
                }

                /* HEREO / HEADER SECTION */
                .vacancies-orchestration-header {
                    position: relative;
                    padding: 48px 56px;
                    border-radius: 32px;
                    overflow: hidden;
                    margin-bottom: 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(135deg, #2a050b 0%, var(--crimson-dark) 100%);
                    box-shadow: 0 20px 50px rgba(139, 26, 43, 0.15);
                }

                .hero-bg-accent {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        radial-gradient(circle at 80% 20%, rgba(200, 169, 81, 0.15) 0%, transparent 40%),
                        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                    background-size: 100% 100%, 40px 40px, 40px 40px;
                    background-position: center;
                    opacity: 0.6;
                    pointer-events: none;
                }

                .header-content-p { position: relative; z-index: 2; }

                .console-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 6px 14px;
                    border-radius: 100px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #e2e8f0;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    margin-bottom: 16px;
                    backdrop-filter: blur(4px);
                }

                .live-dot {
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                }

                .serif-title-p {
                    font-family: var(--font-heading);
                    font-size: 2.8rem;
                    color: #fff;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }

                .hero-subline {
                    color: rgba(255,255,255,0.7);
                    font-size: 1.1rem;
                    margin: 0;
                    max-width: 600px;
                    line-height: 1.5;
                }

                .btn-establish-p {
                    background: linear-gradient(135deg, var(--gold-accent) 0%, #d4b86a 100%);
                    color: #1a1a2e;
                    border: none;
                    padding: 16px 28px;
                    border-radius: 16px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 10px 30px rgba(200, 169, 81, 0.3);
                    z-index: 10;
                    font-size: 0.95rem;
                }

                .btn-establish-p:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 40px rgba(200, 169, 81, 0.4);
                    background: #d4b86a;
                }

                /* TOOLBAR */
                .console-toolbar-p {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 24px;
                    background: #fff;
                    padding: 24px;
                    border-radius: 24px;
                    border: 1px solid var(--border-light);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                }

                .toolbar-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .search-orchestrator {
                    position: relative;
                    flex: 1;
                    max-width: 100%;
                }

                .s-icon {
                    position: absolute;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    font-size: 1.1rem;
                }

                .search-orchestrator input {
                    width: 100%;
                    padding: 14px 20px 14px 52px;
                    border-radius: 16px;
                    border: 1px solid #f0f2f5;
                    background: #f8fafc;
                    font-size: 0.95rem;
                    transition: all 0.3s;
                }

                .search-orchestrator input:focus {
                    outline: none;
                    background: #fff;
                    border-color: var(--crimson);
                    box-shadow: 0 0 0 4px rgba(139, 26, 43, 0.05);
                }

                .select-orchestrator {
                    position: relative;
                    flex: 1;
                    min-width: 180px;
                }

                .f-icon {
                    position: absolute;
                    left: 18px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--crimson);
                    pointer-events: none;
                }

                .select-orchestrator select {
                    width: 100%;
                    padding: 14px 44px 14px 48px;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    font-size: 0.85rem;
                    font-weight: 700;
                    appearance: none;
                    cursor: pointer;
                    color: var(--text-primary);
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 14px center;
                    background-size: 16px;
                }

                /* TABLE */
                .orchestration-table-wrapper {
                    background: #fff;
                    border-radius: 32px;
                    border: 1px solid var(--border-light);
                    overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.03);
                }

                .orchestrated-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .orchestrated-table th {
                    background: #fcfcfd;
                    padding: 20px 24px;
                    text-align: left;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    border-bottom: 1px solid #f0f2f5;
                }

                .orchestrated-table td {
                    padding: 24px;
                    border-bottom: 1px solid #f8fafc;
                    vertical-align: middle;
                }

                .orchestrated-table tr {
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .orchestrated-table tr:hover { background: #fcfcfd; }
                .orchestrated-table tr:hover td { background: #fcfcfd; }

                .ref-cell span {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    background: #f1f5f9;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-weight: 600;
                }

                .pos-entity-cell { display: flex; flex-direction: column; gap: 4px; }
                .pos-name { font-weight: 800; color: var(--text-primary); font-size: 1.05rem; }
                .entity-name { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }

                .classification-cell { display: flex; flex-direction: column; gap: 6px; }
                .class-badge {
                    background: #eff6ff;
                    color: #2563eb;
                    padding: 3px 12px;
                    border-radius: 100px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    width: fit-content;
                    text-transform: uppercase;
                }
                .designation-sub { font-size: 0.85rem; color: var(--text-secondary); }
                
                .timeline-cell { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--text-muted); }
                .timeline-cell svg { font-size: 0.9rem; margin-right: 4px; }

                .orchestration-actions { display: flex; gap: 8px; justify-content: flex-end; }
                .o-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1.1rem;
                }
                .o-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 15px rgba(0,0,0,0.06); border-color: #e2e8f0; }
                .o-btn.applicants { color: var(--gold-accent); }
                .o-btn.delete { color: var(--crimson); }
                .o-btn.delete:hover { background: var(--crimson); color: #fff; }

                /* MODALS */
                .confirm-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    animation: fadeIn 0.3s ease-out;
                }

                .confirm-modal {
                    background: #fff;
                    border-radius: 32px;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.15);
                }

                /* Candidate Specific Modal styling */
                .cv-banner-p {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    background: #1a1a2e;
                    padding: 24px;
                    border-radius: 20px;
                    color: #fff;
                    margin-top: 32px;
                }

                .cb-icon { 
                    width: 50px; height: 50px; 
                    background: rgba(255, 255, 255, 0.1); 
                    border-radius: 12px; display: flex; 
                    align-items: center; justify-content: center; 
                    font-size: 1.5rem; color: var(--gold-accent);
                }

                .cb-text { flex: 1; }
                .cb-text span { display: block; font-weight: 700; font-size: 1rem; margin-bottom: 4px;}
                .cb-text p { margin: 0; font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); }

                .modal-actions-footer-p {
                    padding: 24px 48px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 16px;
                    background: #fcfcfd;
                }

                .submission-box-p {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    padding: 24px;
                    background: #fdfdfd;
                    border: 1px solid #f1f5f9;
                    border-radius: 16px;
                    gap: 20px;
                }

                .sm-item span { display: block; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; font-weight: 700; }
                .sm-item p { margin: 0; font-weight: 700; color: var(--text-primary); font-size: 0.95rem; }

                .rejection-reason-box {
                    margin-top: 20px; padding: 20px; background: #fef2f2; 
                    border-radius: 12px; border-left: 4px solid #ef4444;
                }
                .rejection-reason-box span { fontSize: 0.75rem; fontWeight: bold; color: #ef4444; textTransform: uppercase; }
                .rejection-reason-box p { margin: 8px 0 0; fontSize: 0.95rem; color: #ef4444; font-weight: 600; line-height: 1.5; }

                /* Professional Stats specific to Talent Pool */
                .professional-stats-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
                .stat-pill-item { 
                    background: var(--bg-primary); 
                    padding: 16px; 
                    border-radius: 16px; 
                    display: flex; 
                    gap: 16px; 
                    align-items: center;
                    border: 1px solid var(--border-light);
                }
                .stat-pill-item.full-w { grid-column: 1 / -1; }
                .stat-pill-item .stat-i { font-size: 1.2rem; color: var(--crimson-muted); flex-shrink: 0; }
                .stat-pill-item .stat-content span { display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
                .stat-pill-item .stat-content strong { display: block; font-size: 0.95rem; color: var(--text-primary); font-weight: 800; }

                .loading-state-p { padding: 100px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; }
                .empty-state-p { padding: 80px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
                .empty-icon { font-size: 3rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 8px; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
                .pulse { animation: pulse 2s infinite; }
                .spinner-p { width: 50px; height: 50px; border: 4px solid #f1f5f9; border-top-color: var(--crimson); border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
"""

new_content = re.sub(r'<style jsx="true">\{`.*?`\}</style>', f'<style jsx="true">{{`{new_css}`}}</style>', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("done")
