import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getExerciseContributions,
  approveExerciseContribution,
  rejectExerciseContribution,
  getApprovedExerciseImages,
  setApprovedExerciseImage,
  removeApprovedExerciseImage,
  compressImageFile,
} from '../../services/exerciseContributionService';
import {
  getAllTesterFeedback,
  getTesterChecklist,
  updateTesterFeedbackStatus,
  deleteTesterFeedback,
  formatFeedbackAsAiTask,
  generateTesterInviteUrl,
  TesterFeedbackItem,
  TesterChecklistItem,
} from '../../services/testerService';
import {
  getAllAvailableOrganizations,
  syncOrganizationsFromFirestore,
  createAdminOrganization,
  updateAdminOrganization,
  deleteAdminOrganization,
  generateSecureJoinCode,
} from '../../services/organizationService';
import { Organization } from '../../schemas/organizationSchema';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import { ExerciseContribution } from '../../schemas/exerciseSchema';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  ShieldAlert,
  X,
  CheckCircle,
  XCircle,
  Camera,
  ClipboardList,
  Bug,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Building2,
  Copy,
  Check,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  BarChart3,
  Layers,
  UploadCloud,
  Edit2,
  AlertCircle,
  Mail,
  Receipt,
  FileText,
} from 'lucide-react';

interface AdminDashboardModalProps {
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'bilder' | 'ovelsesKatalog' | 'testere' | 'organisasjoner' | 'telemetri'>('bilder');

  // 1. Bildebidrag og overstyringer
  const [contributions, setContributions] = useState<ExerciseContribution[]>(() =>
    getExerciseContributions()
  );
  const [approvedImages, setApprovedImages] = useState<Record<string, string>>(() =>
    getApprovedExerciseImages()
  );

  // 2. Øvelseskatalog bilde-management
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(EXERCISE_LIBRARY[0]?.id || '');
  const exerciseFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetPhase, setUploadTargetPhase] = useState<0 | 1>(0);

  // 3. Tester-tilbakemeldinger
  const [feedbacks, setFeedbacks] = useState<TesterFeedbackItem[]>(() => getAllTesterFeedback());
  const [checklist, setChecklist] = useState<TesterChecklistItem[]>(() => getTesterChecklist());
  const [copiedFeedbackId, setCopiedFeedbackId] = useState<string | null>(null);

  // 4. Organisasjoner
  const [organizations, setOrganizations] = useState<Organization[]>(() => getAllAvailableOrganizations());
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);

  // Form states for ny / rediger
  const [formOrgName, setFormOrgName] = useState('');
  const [formOrgDept, setFormOrgDept] = useState('');
  const [formOrgNumber, setFormOrgNumber] = useState('');
  const [formOrgCode, setFormOrgCode] = useState('');
  const [formOrgTeamsStr, setFormOrgTeamsStr] = useState('Hovedkontor, Avdeling 1, Avdeling 2');
  const [formOrgValidUntil, setFormOrgValidUntil] = useState('');
  const [formOrgAgreementType, setFormOrgAgreementType] = useState<'pilot' | 'standard' | 'senior_kommune' | 'idrettslag' | 'tilpasset'>('pilot');
  const [formOrgMaxSeats, setFormOrgMaxSeats] = useState<string>('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formInvoiceEmail, setFormInvoiceEmail] = useState('');
  const [formInvoiceAddress, setFormInvoiceAddress] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formOrgNotes, setFormOrgNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);
  const [copiedTesterUrl, setCopiedTesterUrl] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  useEffect(() => {
    const handleContribs = () => {
      setContributions(getExerciseContributions());
      setApprovedImages(getApprovedExerciseImages());
    };
    const handleFeedbacks = () => {
      setFeedbacks(getAllTesterFeedback());
      setChecklist(getTesterChecklist());
    };

    const handleOrgs = () => {
      setOrganizations(getAllAvailableOrganizations());
    };

    // Synkroniser organisasjoner fra Firestore for admin ved åpning
    syncOrganizationsFromFirestore().catch(() => {});

    window.addEventListener('exercise-contributions-changed', handleContribs);
    window.addEventListener('approved-images-changed', handleContribs);
    window.addEventListener('tester-feedback-changed', handleFeedbacks);
    window.addEventListener('tester-checklist-changed', handleFeedbacks);
    window.addEventListener('admin-organizations-changed', handleOrgs);

    return () => {
      window.removeEventListener('exercise-contributions-changed', handleContribs);
      window.removeEventListener('approved-images-changed', handleContribs);
      window.removeEventListener('tester-feedback-changed', handleFeedbacks);
      window.removeEventListener('tester-checklist-changed', handleFeedbacks);
      window.removeEventListener('admin-organizations-changed', handleOrgs);
    };
  }, []);

  const resetOrgForm = () => {
    setFormOrgName('');
    setFormOrgDept('');
    setFormOrgNumber('');
    setFormOrgCode('');
    setFormOrgTeamsStr('Hovedkontor, Avdeling 1, Avdeling 2');
    setFormOrgValidUntil('');
    setFormOrgAgreementType('pilot');
    setFormOrgMaxSeats('');
    setFormContactName('');
    setFormContactEmail('');
    setFormContactPhone('');
    setFormInvoiceEmail('');
    setFormInvoiceAddress('');
    setFormAccountNumber('');
    setFormOrgNotes('');
    setFormIsActive(true);
    setEditingOrg(null);
    setShowNewOrgForm(false);
  };

  const startEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setFormOrgName(org.name);
    setFormOrgDept(org.department || '');
    setFormOrgNumber(org.orgNumber || '');
    setFormOrgCode(org.joinCode);
    setFormOrgTeamsStr(org.teams?.map((t) => t.name).join(', ') || 'Hovedkontor');
    setFormOrgValidUntil(org.validUntil || '');
    setFormOrgAgreementType(org.agreementType || 'standard');
    setFormOrgMaxSeats(org.maxSeats ? String(org.maxSeats) : '');
    setFormContactName(org.contactPerson?.name || '');
    setFormContactEmail(org.contactPerson?.email || '');
    setFormContactPhone(org.contactPerson?.phone || '');
    setFormInvoiceEmail(org.billing?.invoiceEmail || '');
    setFormInvoiceAddress(org.billing?.address || '');
    setFormAccountNumber(org.billing?.accountNumber || '');
    setFormOrgNotes(org.notes || '');
    setFormIsActive(org.isActive !== false);
    setShowNewOrgForm(true);
  };

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOrgName.trim()) return;

    const parsedTeams = formOrgTeamsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const seatsNum = formOrgMaxSeats ? parseInt(formOrgMaxSeats, 10) : undefined;

    const contactPerson = formContactName.trim()
      ? {
          name: formContactName.trim(),
          email: formContactEmail.trim() || undefined,
          phone: formContactPhone.trim() || undefined,
        }
      : undefined;

    const billing = (formInvoiceEmail.trim() || formInvoiceAddress.trim() || formAccountNumber.trim())
      ? {
          invoiceEmail: formInvoiceEmail.trim() || undefined,
          address: formInvoiceAddress.trim() || undefined,
          accountNumber: formAccountNumber.trim() || undefined,
        }
      : undefined;

    if (editingOrg) {
      updateAdminOrganization(editingOrg.id, {
        name: formOrgName.trim(),
        department: formOrgDept.trim() || undefined,
        orgNumber: formOrgNumber.trim() || undefined,
        joinCode: formOrgCode.trim().toUpperCase() || editingOrg.joinCode,
        validUntil: formOrgValidUntil || undefined,
        isActive: formIsActive,
        agreementType: formOrgAgreementType,
        maxSeats: isNaN(seatsNum as number) ? undefined : seatsNum,
        contactPerson,
        billing,
        notes: formOrgNotes.trim() || undefined,
        teams: parsedTeams.length > 0 ? parsedTeams.map((t, i) => ({ id: `team-${i + 1}`, name: t.name })) : editingOrg.teams,
      });
    } else {
      createAdminOrganization({
        name: formOrgName.trim(),
        department: formOrgDept.trim() || undefined,
        orgNumber: formOrgNumber.trim() || undefined,
        joinCode: formOrgCode.trim() || undefined,
        teams: parsedTeams,
        validUntil: formOrgValidUntil || undefined,
        agreementType: formOrgAgreementType,
        maxSeats: isNaN(seatsNum as number) ? undefined : seatsNum,
        contactPerson,
        billing,
        notes: formOrgNotes.trim() || undefined,
      });
    }

    setOrganizations(getAllAvailableOrganizations());
    resetOrgForm();
  };

  const handleApprove = (id: string) => {
    approveExerciseContribution(id);
    setContributions(getExerciseContributions());
    setApprovedImages(getApprovedExerciseImages());
  };

  const handleReject = (id: string) => {
    rejectExerciseContribution(id);
    setContributions(getExerciseContributions());
  };

  // Kopier som AI oppdrag
  const handleCopyAiTask = (item: TesterFeedbackItem) => {
    const formatted = formatFeedbackAsAiTask(item);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      setCopiedFeedbackId(item.id);
      setTimeout(() => setCopiedFeedbackId(null), 2500);
    }
  };

  // Kopier testerlenke
  const handleCopyTesterLink = (code: string) => {
    const url = generateTesterInviteUrl(code);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedTesterUrl(true);
      setTimeout(() => setCopiedTesterUrl(false), 2500);
    }
  };

  // Kopier organisasjons onboarding-lenke
  const handleCopyOrgLink = (org: Organization) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mintrener.web.app';
    const url = `${origin}/?org=${encodeURIComponent(org.joinCode)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedOrgId(org.id);
      setTimeout(() => setCopiedOrgId(null), 2500);
    }
  };


  // Bildeoverstyring fra admin
  const handleAdminImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedExerciseId) return;

    try {
      const compressed = await compressImageFile(file, 1080, 0.85);
      setApprovedExerciseImage(selectedExerciseId, uploadTargetPhase, compressed);
      setApprovedImages(getApprovedExerciseImages());
    } catch (err) {
      console.error('Kunne ikke laste opp bilde som admin:', err);
    }
  };

  const handleResetImage = (exId: string, phase: 0 | 1) => {
    removeApprovedExerciseImage(exId, phase);
    setApprovedImages(getApprovedExerciseImages());
  };

  const pendingContributions = contributions.filter((c) => c.status === 'pending');
  const approvedCount = Object.keys(approvedImages).length;

  const filteredExercises = EXERCISE_LIBRARY.filter((ex) =>
    ex.navn.nb.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.id.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const selectedExercise = EXERCISE_LIBRARY.find((e) => e.id === selectedExerciseId) || EXERCISE_LIBRARY[0];

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 text-white"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dashboard-title"
        className="w-full max-w-3xl max-h-[94vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col overflow-hidden space-y-3.5 relative z-[131] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-dashboard-title" className="text-base font-black text-white flex items-center gap-2">
                <span>Admin Kontrollpanel</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Moderator & Bedrift
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">
                Administrer øvelser, testrapporter, bedriftsavtaler og telemetri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk kontrollpanel"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-5 gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 shrink-0 text-center">
          <button
            onClick={() => setActiveTab('bilder')}
            className={`py-1.5 px-1 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
              activeTab === 'bilder' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Bidrag ({pendingContributions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ovelsesKatalog')}
            className={`py-1.5 px-1 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
              activeTab === 'ovelsesKatalog' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Øvelser (68)</span>
          </button>

          <button
            onClick={() => setActiveTab('testere')}
            className={`py-1.5 px-1 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
              activeTab === 'testere' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Rapporter ({feedbacks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('organisasjoner')}
            className={`py-1.5 px-1 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
              activeTab === 'organisasjoner' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Bedrifter ({organizations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetri')}
            className={`py-1.5 px-1 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
              activeTab === 'telemetri' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Statistikk</span>
          </button>
        </div>

        {/* Scrollbart Innhold */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* FANE 1: BILDEGODKJENNING */}
          {activeTab === 'bilder' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Ventende bildebidrag ({pendingContributions.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {approvedCount} bilder godkjent som standard
                </span>
              </div>

              {pendingContributions.length === 0 ? (
                <div className="p-6 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-400 space-y-1">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
                  <p className="font-bold text-white text-xs">Ingen ventende bildebidrag</p>
                  <p className="text-[10px]">
                    Nye bilder som brukere sender inn fra øvelsesdetaljene vises her for godkjenning.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingContributions.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs uppercase">{c.exerciseId}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                            {c.phase === 0 ? 'Fase 1: Start' : 'Fase 2: Slutt'}
                          </span>
                        </div>

                        <div className="relative rounded-xl overflow-hidden bg-black h-40 border border-zinc-850 flex items-center justify-center">
                          <img
                            src={c.imageDataUrl}
                            alt={c.exerciseId}
                            className="max-h-40 w-auto object-contain"
                          />
                        </div>

                        <div className="text-[10px] text-zinc-400 space-y-0.5">
                          <p>
                            <strong>Innsendt av:</strong> {c.submittedByName}
                          </p>
                          {c.notes && (
                            <p className="italic text-zinc-300">«{c.notes}»</p>
                          )}
                          <p className="text-[9px] text-zinc-500">
                            {new Date(c.submittedAt).toLocaleDateString('nb-NO')} kl.{' '}
                            {new Date(c.submittedAt).toLocaleTimeString('nb-NO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Godkjenn / Avvis knapper */}
                      <div className="flex gap-2 pt-2 border-t border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => handleApprove(c.id)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Godkjenn som default</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(c.id)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 text-zinc-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Avvis</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FANE 2: ØVELSER OG BILDEKATALOG-ADMINISTRASJON */}
          {activeTab === 'ovelsesKatalog' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-xs">Administrer øvelsesbilder direkte</h3>
                  <p className="text-[10px] text-zinc-400">
                    Søk opp en øvelse for å inspisere, laste opp nytt bilde for fase 1 eller 2, eller nullstille.
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {EXERCISE_LIBRARY.length} øvelser
                </span>
              </div>

              {/* Søk og liste */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      placeholder="Søk øvelse..."
                      className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-1 pr-1 bg-zinc-950/60 p-1.5 rounded-xl border border-zinc-800">
                    {filteredExercises.map((ex) => {
                      const isSelected = ex.id === selectedExerciseId;
                      const hasPhase0 = Boolean(approvedImages[`${ex.id}-0`]);
                      const hasPhase1 = Boolean(approvedImages[`${ex.id}-1`]);
                      return (
                        <button
                          key={ex.id}
                          onClick={() => setSelectedExerciseId(ex.id)}
                          className={`w-full p-2 text-left rounded-lg transition-all flex items-center justify-between ${
                            isSelected ? 'bg-amber-600 text-white font-bold' : 'hover:bg-zinc-800/80 text-zinc-300'
                          }`}
                        >
                          <span className="text-xs truncate">{ex.navn.nb}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {(hasPhase0 || hasPhase1) && (
                              <span className="text-[8px] px-1 rounded bg-emerald-500/30 text-emerald-300">
                                Overstyrt
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Valgt øvelse detaljer */}
                {selectedExercise && (
                  <div className="md:col-span-2 p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{selectedExercise.navn.nb}</h4>
                        <p className="text-[10px] text-zinc-400 font-mono">ID: {selectedExercise.id} · {selectedExercise.kategori}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize">
                        Vinkel: {selectedExercise.bildeVinkel || 'side'}
                      </span>
                    </div>

                    {/* Skjult input for opplasting */}
                    <input
                      ref={exerciseFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAdminImageUpload}
                      className="hidden"
                    />

                    {/* Faser 0 og 1 */}
                    <div className="grid grid-cols-2 gap-3">
                      {([0, 1] as const).map((phase) => {
                        const approvedUrl = approvedImages[`${selectedExercise.id}-${phase}`];
                        const defaultImgUrl = `/images/exercises/${selectedExercise.id}-${phase}.png`;
                        const activeUrl = approvedUrl || defaultImgUrl;

                        return (
                          <div key={phase} className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-zinc-300">
                                {phase === 0 ? 'Fase 1: Start' : 'Fase 2: Slutt'}
                              </span>
                              {approvedUrl && (
                                <span className="text-[9px] text-emerald-400 font-bold">Admin-satt</span>
                              )}
                            </div>

                            <div className="relative rounded-lg overflow-hidden bg-black h-36 border border-zinc-850 flex items-center justify-center">
                              <img
                                src={activeUrl}
                                alt={`${selectedExercise.navn.nb} fase ${phase}`}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                className="max-h-36 w-auto object-contain"
                              />
                            </div>

                            <div className="flex gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadTargetPhase(phase);
                                  exerciseFileInputRef.current?.click();
                                }}
                                className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all"
                              >
                                <UploadCloud className="w-3 h-3" />
                                <span>Last opp</span>
                              </button>

                              {approvedUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleResetImage(selectedExercise.id, phase)}
                                  title="Nullstill til standardbilde"
                                  className="p-1.5 bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 text-zinc-400 rounded-lg transition-all"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FANE 3: TESTERAPPORTER & AI OPPDRAG */}
          {activeTab === 'testere' && (
            <div className="space-y-4">
              {/* Invitasjonslenke for testere */}
              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-2xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Tester-invitasjonslenke (1-klikk onboarding)
                    </span>
                    <p className="text-xs text-zinc-300">
                      Send denne lenken til testeren. Når de åpner lenken, aktiveres testermodusen automatisk!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTesterLink('TEST2026')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all shrink-0 ${
                      copiedTesterUrl ? 'bg-emerald-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {copiedTesterUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTesterUrl ? 'Kopiert!' : 'Kopier testerlenke'}</span>
                  </button>
                </div>
              </div>

              {/* Sjekklistestatus sammendrag */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Framdrift på strukturert testsjekkliste
                </span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-zinc-900 rounded-xl">
                    <span className="font-black text-emerald-400 text-sm block">
                      {checklist.filter((i) => i.status === 'ok').length}
                    </span>
                    <span className="text-[8px] uppercase text-zinc-400 font-bold">Godkjent</span>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded-xl">
                    <span className="font-black text-rose-400 text-sm block">
                      {checklist.filter((i) => i.status === 'har_avvik').length}
                    </span>
                    <span className="text-[8px] uppercase text-zinc-400 font-bold">Med avvik</span>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded-xl">
                    <span className="font-black text-zinc-400 text-sm block">
                      {checklist.filter((i) => i.status === 'ikke_startet').length}
                    </span>
                    <span className="text-[8px] uppercase text-zinc-400 font-bold">Utestet</span>
                  </div>
                </div>
              </div>

              {/* Liste over innkomne tilbakemeldinger */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Innkomne testerrapporter ({feedbacks.length})
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Klar for Antigravity / Claude Code
                  </span>
                </div>

                {feedbacks.length === 0 ? (
                  <p className="text-zinc-500 text-center py-6 bg-zinc-950 rounded-2xl border border-zinc-850">
                    Ingen rapporter mottatt ennå.
                  </p>
                ) : (
                  feedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {fb.type === 'feilrapport' ? (
                            <span className="p-1 rounded bg-rose-500/20 text-rose-300">
                              <Bug className="w-3.5 h-3.5" />
                            </span>
                          ) : fb.type === 'onskesituasjon' ? (
                            <span className="p-1 rounded bg-amber-500/20 text-amber-300">
                              <Lightbulb className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded bg-purple-500/20 text-purple-300">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-white text-xs">
                              {fb.title || (fb.type === 'feilrapport' ? 'Feilobservasjon' : 'Tilbakemelding')}
                            </p>
                            <span className="text-[9px] text-zinc-400">
                              Fra {fb.submittedByName} · {new Date(fb.submittedAt).toLocaleDateString('nb-NO')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Kopier som AI-oppdrag */}
                          <button
                            type="button"
                            onClick={() => handleCopyAiTask(fb)}
                            title="Kopier strukturert oppdrag for Antigravity / Claude Code"
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                              copiedFeedbackId === fb.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {copiedFeedbackId === fb.id ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            <span>{copiedFeedbackId === fb.id ? 'Kopiert!' : 'Kopier for Claude/AI'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteTesterFeedback(fb.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Slett rapport"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850">
                        {fb.feedbackText}
                      </p>

                      {/* Skjermbilde hvis vedlagt */}
                      {fb.screenshotBase64 && (
                        <div className="relative rounded-xl overflow-hidden border border-zinc-800 max-h-48 bg-black flex items-center justify-center">
                          <img
                            src={fb.screenshotBase64}
                            alt="Skjermbilde fra tester"
                            className="max-h-48 w-auto object-contain"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-850">
                        <span>Enhet: {fb.deviceContext.screenSize} ({fb.deviceContext.isStandalone ? 'PWA' : 'Web'})</span>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">Status:</span>
                          <select
                            value={fb.status || 'ny'}
                            onChange={(e) => updateTesterFeedbackStatus(fb.id, e.target.value as any)}
                            className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-white"
                          >
                            <option value="ny">Ny</option>
                            <option value="under_arbeid">Under arbeid</option>
                            <option value="lost">Løst</option>
                            <option value="arkivert">Arkivert</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* FANE 4: ORGANISASJONER & AVTALER */}
          {activeTab === 'organisasjoner' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-xs">Bedriftsavtaler & Organisasjoner</h3>
                  <p className="text-[10px] text-zinc-400">
                    Administrer avtaler, utløpsdatoer, kontaktpersoner, fakturainfo og 1-klikks onboarding-lenker.
                  </p>
                </div>
                {!showNewOrgForm && (
                  <button
                    type="button"
                    onClick={() => {
                      resetOrgForm();
                      setShowNewOrgForm(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ny bedriftsavtale</span>
                  </button>
                )}
              </div>

              {/* Skjema for ny eller redigert organisasjon */}
              {showNewOrgForm && (
                <form
                  onSubmit={handleSaveOrg}
                  className="p-4 bg-zinc-950 border border-blue-500/40 rounded-2xl space-y-3.5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      {editingOrg ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {editingOrg ? `Rediger avtale: ${editingOrg.name}` : 'Opprett ny bedrifts- eller gruppeavtale'}
                    </span>
                    <button
                      type="button"
                      onClick={resetOrgForm}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Seksjon 1: Hovedinformasjon */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">1. Bedriftsdetaljer</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Bedriftsnavn *</label>
                        <input
                          type="text"
                          value={formOrgName}
                          onChange={(e) => setFormOrgName(e.target.value)}
                          placeholder="f.eks. Equinor ASA"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Org.nummer (9 siffer)</label>
                        <input
                          type="text"
                          value={formOrgNumber}
                          onChange={(e) => setFormOrgNumber(e.target.value.replace(/\s+/g, ''))}
                          placeholder="f.eks. 923456789"
                          maxLength={12}
                          className="w-full py-1.5 px-2.5 font-mono bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Avdeling / Enhet (valgfritt)</label>
                        <input
                          type="text"
                          value={formOrgDept}
                          onChange={(e) => setFormOrgDept(e.target.value)}
                          placeholder="f.eks. Fornebu IT & Utvikling"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Avtaletype</label>
                        <select
                          value={formOrgAgreementType}
                          onChange={(e) => setFormOrgAgreementType(e.target.value as any)}
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        >
                          <option value="pilot">Pilotavtale (gratis prøve)</option>
                          <option value="standard">Standard Bedriftsavtale</option>
                          <option value="senior_kommune">Kommune / Seniorhelse</option>
                          <option value="idrettslag">Idrettslag / Forening</option>
                          <option value="tilpasset">Skreddersydd avtale</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Seksjon 2: Tilgang, Koder & Utløpsdato */}
                  <div className="space-y-2 pt-1 border-t border-zinc-900">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">2. Kode, Varighet & Lisenser</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] text-zinc-400">Avtalekode</label>
                          {!editingOrg && (
                            <button
                              type="button"
                              onClick={() => setFormOrgCode(generateSecureJoinCode(formOrgName.slice(0, 3) || 'BED'))}
                              className="text-[9px] text-blue-400 hover:underline"
                            >
                              Ny kode
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={formOrgCode}
                          onChange={(e) => setFormOrgCode(e.target.value.toUpperCase())}
                          placeholder="f.eks. EQN-9X4K"
                          className="w-full py-1.5 px-2.5 font-mono font-bold bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Utløpsdato (f.eks. pilot)</label>
                        <input
                          type="date"
                          value={formOrgValidUntil}
                          onChange={(e) => setFormOrgValidUntil(e.target.value)}
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Maks antall brukere/lisenser</label>
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={formOrgMaxSeats}
                          onChange={(e) => setFormOrgMaxSeats(e.target.value)}
                          placeholder="f.eks. 50"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">
                          Lag / Lokasjoner (kommaseparert):
                        </label>
                        <input
                          type="text"
                          value={formOrgTeamsStr}
                          onChange={(e) => setFormOrgTeamsStr(e.target.value)}
                          placeholder="Oslo, Bergen, Stavanger"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Avtalestatus:</label>
                        <div className="flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-1.5 text-xs text-zinc-200 cursor-pointer">
                            <input
                              type="radio"
                              name="orgStatus"
                              checked={formIsActive}
                              onChange={() => setFormIsActive(true)}
                              className="accent-emerald-500"
                            />
                            <span>Aktiv</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-zinc-200 cursor-pointer">
                            <input
                              type="radio"
                              name="orgStatus"
                              checked={!formIsActive}
                              onChange={() => setFormIsActive(false)}
                              className="accent-rose-500"
                            />
                            <span>Deaktivert / Satt på pause</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seksjon 3: Kontaktperson & Faktura/Betaling */}
                  <div className="space-y-2 pt-1 border-t border-zinc-900">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">3. Kontakt & Faktura</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Kontaktperson</label>
                        <input
                          type="text"
                          value={formContactName}
                          onChange={(e) => setFormContactName(e.target.value)}
                          placeholder="Navn (f.eks. Ola Nordmann)"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Kontakt e-post</label>
                        <input
                          type="email"
                          value={formContactEmail}
                          onChange={(e) => setFormContactEmail(e.target.value)}
                          placeholder="kontakt@bedrift.no"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Kontakt telefon</label>
                        <input
                          type="tel"
                          value={formContactPhone}
                          onChange={(e) => setFormContactPhone(e.target.value)}
                          placeholder="+47 900 00 000"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Faktura-e-post / EHF</label>
                        <input
                          type="text"
                          value={formInvoiceEmail}
                          onChange={(e) => setFormInvoiceEmail(e.target.value)}
                          placeholder="faktura@bedrift.no"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Fakturaadresse / Poststed</label>
                        <input
                          type="text"
                          value={formInvoiceAddress}
                          onChange={(e) => setFormInvoiceAddress(e.target.value)}
                          placeholder="Postboks 123, 0101 Oslo"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Kontonummer / KID-ref</label>
                        <input
                          type="text"
                          value={formAccountNumber}
                          onChange={(e) => setFormAccountNumber(e.target.value)}
                          placeholder="f.eks. 1234.56.78901"
                          className="w-full py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seksjon 4: Interne notater */}
                  <div className="pt-1 border-t border-zinc-900">
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Interne admin-notater (kun synlig for deg):</label>
                    <textarea
                      rows={2}
                      value={formOrgNotes}
                      onChange={(e) => setFormOrgNotes(e.target.value)}
                      placeholder="F.eks. '30 dagers pilot avtalt på Teams-møte 4. sept. Oppfølgingsmøte planlagt 1. okt.'"
                      className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white resize-none"
                    />
                  </div>

                  {/* Handlingsknapper */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={resetOrgForm}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
                    >
                      Avbryt
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow"
                    >
                      {editingOrg ? 'Oppdater avtale' : 'Lagre ny avtale'}
                    </button>
                  </div>
                </form>
              )}

              {/* Slettebekreftelse modal/advarsel */}
              {deletingOrgId && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-600/50 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-bold text-xs">
                      Er du sikker på at du vil slette eller arkivere denne avtalen?
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-200/80">
                    Brukere som bruker denne koden vil ikke lenger kunne logge seg på denne bedriften.
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDeletingOrgId(null)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-bold"
                    >
                      Nei, avbryt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteAdminOrganization(deletingOrgId);
                        setDeletingOrgId(null);
                        setOrganizations(getAllAvailableOrganizations());
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg font-bold shadow"
                    >
                      Ja, slett avtalen
                    </button>
                  </div>
                </div>
              )}

              {/* Liste over organisasjoner */}
              <div className="space-y-2.5">
                {organizations.map((org) => {
                  const isCopied = copiedOrgId === org.id;
                  const isExpired = org.validUntil ? new Date(org.validUntil).getTime() < Date.now() : false;
                  const isArchived = org.notes?.includes('[Arkivert / Slettet');

                  if (isArchived) return null; // Skjul arkiverte presets

                  return (
                    <div
                      key={org.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                        org.isActive === false || isExpired
                          ? 'bg-zinc-950/60 border-zinc-850'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs">{org.name}</span>
                            {org.department && (
                              <span className="text-[10px] text-zinc-400">({org.department})</span>
                            )}
                            {org.orgNumber && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                                Org.nr: {org.orgNumber}
                              </span>
                            )}
                            {org.isActive === false ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                                Deaktivert
                              </span>
                            ) : isExpired ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                Utløpt ({org.validUntil})
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                Aktiv
                              </span>
                            )}
                            {org.agreementType && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 uppercase font-semibold">
                                {org.agreementType === 'pilot' ? 'Pilot' : org.agreementType}
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-zinc-400 pt-1">
                            Lag: <span className="text-zinc-300 font-medium">{org.teams?.map((t) => t.name).join(', ') || 'Fellesteam'}</span>
                            {org.validUntil && (
                              <span className="ml-2 text-zinc-400">
                                · Gyldig til: <strong className={isExpired ? 'text-amber-400' : 'text-zinc-200'}>{org.validUntil}</strong>
                              </span>
                            )}
                            {org.maxSeats && (
                              <span className="ml-2 text-zinc-400">
                                · Lisenser: <strong>{org.maxSeats}</strong>
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-blue-300 font-mono font-bold text-xs">
                            {org.joinCode}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyOrgLink(org)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30'
                            }`}
                            title="Kopier onboarding-lenke for ansatte"
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Kopiert!' : 'Kopier lenke'}</span>
                          </button>

                          {/* Rediger knapp */}
                          <button
                            type="button"
                            onClick={() => startEditOrg(org)}
                            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors"
                            title="Rediger avtale, utløpsdato og kontaktinfo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Slett knapp */}
                          <button
                            type="button"
                            onClick={() => setDeletingOrgId(org.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors"
                            title="Slett denne avtalen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tilleggsinformasjon hvis registrert */}
                      {(org.contactPerson || org.billing || org.notes) && (
                        <div className="pt-2 border-t border-zinc-900 text-[10px] text-zinc-400 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {org.contactPerson && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate">
                                Kontakt: <strong className="text-zinc-300">{org.contactPerson.name}</strong> {org.contactPerson.email ? `(${org.contactPerson.email})` : ''}
                              </span>
                            </div>
                          )}
                          {org.billing?.invoiceEmail && (
                            <div className="flex items-center gap-1.5">
                              <Receipt className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate">Faktura: {org.billing.invoiceEmail}</span>
                            </div>
                          )}
                          {org.notes && (
                            <div className="flex items-center gap-1.5 sm:col-span-3 text-zinc-500 italic">
                              <FileText className="w-3 h-3 text-zinc-600 shrink-0" />
                              <span>Notat: {org.notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FANE 5: TELEMETRI & STATISTIKK */}
          {activeTab === 'telemetri' && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Mest brukte øvelser og treningsmønstre
                </span>
                <p className="text-xs text-zinc-300">
                  Dataene aggregeres anonymt for å se hvilke øvelser og programmer som fungerer best i praksis.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="p-2.5 bg-zinc-900 rounded-xl text-center">
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Biblioteksstørrelse</span>
                    <strong className="text-lg text-white font-black">68</strong>
                    <span className="text-[8px] text-zinc-400 block">Kvalitetssikret</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-xl text-center">
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Bildeoverstyringer</span>
                    <strong className="text-lg text-emerald-400 font-black">{approvedCount}</strong>
                    <span className="text-[8px] text-zinc-400 block">I drift</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-xl text-center">
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Bedriftsavtaler</span>
                    <strong className="text-lg text-blue-400 font-black">{organizations.length}</strong>
                    <span className="text-[8px] text-zinc-400 block">Aktive miljøer</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-xl text-center">
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Testrapporter</span>
                    <strong className="text-lg text-purple-400 font-black">{feedbacks.length}</strong>
                    <span className="text-[8px] text-zinc-400 block">Logget</span>
                  </div>
                </div>
              </div>

              {/* Topp 5 øvelser fra standardkatalogen */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Faste kjerneøvelser i fellespausene
                </span>
                <div className="space-y-1.5">
                  {EXERCISE_LIBRARY.slice(0, 5).map((ex, idx) => (
                    <div key={ex.id} className="p-2 rounded-xl bg-zinc-900/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-white text-xs">{ex.navn.nb}</p>
                          <p className="text-[9px] text-zinc-400 capitalize">{ex.kategori} · {ex.utstyr}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        100 % instruksjonsdekning
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lukk */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-2xl transition-all"
          >
            Lukk kontrollpanel
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
