'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Activity,
  Dumbbell,
  Pill,
  TestTube,
  AlertCircle,
  CheckCircle2,
  Plus,
  User,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap,
  BrainCircuit,
  Menu,
  X,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  heightCm?: number;
  weightKg?: number;
  trainingLevel?: string;
  conditions: UserCondition[];
  _count?: {
    trainingSessions: number;
    biomarkerLogs: number;
    pharmacologyLogs: number;
  };
}

interface UserCondition {
  id: string;
  conditionName: string;
  conditionType?: string;
  severity?: string;
  isActive: boolean;
}

interface TrainingSession {
  id: string;
  sessionDate: string;
  sessionType?: string;
  totalTonnage?: number;
  inolScore?: number;
  acwrRatio?: number;
  perceivedEffort?: number;
  modality?: string;
}

interface PharmacologyLog {
  id: string;
  substanceName: string;
  dosageMg: number;
  halfLifeHours: number;
  administrationDate: string;
  substanceType?: string;
  pharmacokinetics?: {
    currentConcentration: number;
    remainingPercentage: number;
    peakImpactLevel: string;
  };
}

interface BiomarkerLog {
  id: string;
  testDate: string;
  testType?: string;
  biomarkers: string;
  reliabilityScore?: number;
  interpretation?: string;
}

interface DailyReadiness {
  id: string;
  logDate: string;
  sleepHours?: number;
  sleepQuality?: number;
  muscleSoreness?: number;
  energyLevel?: number;
  wellnessScore?: number;
}

interface DashboardData {
  user: User;
  metrics: {
    training: {
      totalSessions: number;
      totalTonnage: number;
      currentWeekTonnage: number;
      avgINOL: number;
      acwr: {
        ratio: number;
        riskLevel: string;
        interpretation: string;
      };
    };
    biomarkers: BiomarkerLog | null;
    readiness: DailyReadiness | null;
    pharmacology: PharmacologyLog[];
  };
  overallStatus: 'optimal' | 'attention' | 'concern';
  riskFactors: string[];
  naturalLanguageSummary: string;
}

type SectionType = 'overview' | 'treino' | 'farmaco' | 'biomarcadores' | 'alertas' | 'usuarios' | 'config';

export default function NexusCoreDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [pharmacologyLogs, setPharmacologyLogs] = useState<PharmacologyLog[]>([]);
  const [biomarkerLogs, setBiomarkerLogs] = useState<BiomarkerLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Dialog states
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showNewPharmaDialog, setShowNewPharmaDialog] = useState(false);
  const [showNewBiomarkerDialog, setShowNewBiomarkerDialog] = useState(false);
  const [showNewConditionDialog, setShowNewConditionDialog] = useState(false);

  // API Autocomplete states
  const [clinicalQuery, setClinicalQuery] = useState('');
  const [clinicalResults, setClinicalResults] = useState<{code: string, name: string}[]>([]);
  const [isSearchingClinical, setIsSearchingClinical] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<{code: string, name: string} | null>(null);

  const [pharmaQuery, setPharmaQuery] = useState('');
  const [pharmaResults, setPharmaResults] = useState<{brand_name: string, generic_name: string, dosage_form: string}[]>([]);
  const [isSearchingPharma, setIsSearchingPharma] = useState(false);
  const [selectedPharma, setSelectedPharma] = useState<{brand_name: string, generic_name: string, dosage_form: string} | null>(null);


  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch dashboard data when user is selected
  useEffect(() => {
    if (selectedUserId) {
      fetchDashboardData(selectedUserId);
      fetchTrainingSessions(selectedUserId);
      fetchPharmacologyLogs(selectedUserId);
      fetchBiomarkerLogs(selectedUserId);
    }
  }, [selectedUserId]);

  // Clinical Autocomplete effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (clinicalQuery.length >= 3) {
        setIsSearchingClinical(true);
        try {
          const res = await fetch(`/api/external/clinical?q=${encodeURIComponent(clinicalQuery)}`);
          if(res.ok) {
            const data = await res.json();
            setClinicalResults(data.results || []);
          }
        } catch (error) {
          console.error("Clinical API Error:", error);
        } finally {
          setIsSearchingClinical(false);
        }
      } else {
        setClinicalResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [clinicalQuery]);

  // Pharma Autocomplete effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (pharmaQuery.length >= 3) {
        setIsSearchingPharma(true);
        try {
          const res = await fetch(`/api/external/fda?q=${encodeURIComponent(pharmaQuery)}`);
          if(res.ok) {
            const data = await res.json();
            setPharmaResults(data.results || []);
          }
        } catch (error) {
          console.error("OpenFDA API Error:", error);
        } finally {
          setIsSearchingPharma(false);
        }
      } else {
        setPharmaResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [pharmaQuery]);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
      if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/dashboard`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingSessions = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/training?limit=10`);
      const data = await response.json();
      setTrainingSessions(data);
    } catch (error) {
      console.error('Error fetching training sessions:', error);
    }
  };

  const fetchPharmacologyLogs = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/pharmacology`);
      const data = await response.json();
      setPharmacologyLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching pharmacology logs:', error);
    }
  };

  const fetchBiomarkerLogs = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/biomarkers?limit=5`);
      const data = await response.json();
      setBiomarkerLogs(data);
    } catch (error) {
      console.error('Error fetching biomarker logs:', error);
    }
  };

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = Object.fromEntries(formData.entries());

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      setShowNewUserDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const createCondition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUserId || !selectedCondition) return;

    const formData = new FormData(e.currentTarget);
    const conditionData = {
      conditionName: `${selectedCondition.code} - ${selectedCondition.name}`,
      conditionType: formData.get('conditionType'),
      severity: formData.get('severity'),
      isActive: true,
    };

    try {
      await fetch(`/api/users/${selectedUserId}/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conditionData),
      });
      setShowNewConditionDialog(false);
      setSelectedCondition(null);
      setClinicalQuery('');
      fetchDashboardData(selectedUserId);
      fetchUsers(); // Refresh user list to get updated conditions
    } catch (error) {
      console.error('Error creating condition:', error);
    }
  };

  const createTrainingSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUserId) return;

    const formData = new FormData(e.currentTarget);
    const exercises = [
      {
        name: formData.get('exercise1_name'),
        sets: parseInt(formData.get('exercise1_sets') as string),
        reps: parseInt(formData.get('exercise1_reps') as string),
        loadKg: parseFloat(formData.get('exercise1_load') as string),
        percentageOf1RM: parseFloat(formData.get('exercise1_percent') as string),
      }
    ].filter(ex => ex.name && ex.sets && ex.reps && ex.loadKg);

    const sessionData = {
      sessionDate: formData.get('sessionDate'),
      sessionType: formData.get('sessionType'),
      modality: formData.get('modality'),
      exercises,
      perceivedEffort: formData.get('perceivedEffort'),
    };

    try {
      await fetch(`/api/users/${selectedUserId}/training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      setShowNewSessionDialog(false);
      fetchDashboardData(selectedUserId);
      fetchTrainingSessions(selectedUserId);
    } catch (error) {
      console.error('Error creating training session:', error);
    }
  };

  const createPharmacologyLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUserId || !selectedPharma) return;

    const formData = new FormData(e.currentTarget);
    const rawDate = formData.get('administrationDate') as string;
    const adminDateToSave = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

    const pharmaData = {
      substanceName: `${selectedPharma.brand_name} (${selectedPharma.generic_name})`,
      substanceType: formData.get('substanceType'),
      dosageMg: parseFloat(formData.get('dosageMg') as string),
      halfLifeHours: parseFloat(formData.get('halfLifeHours') as string),
      administrationDate: adminDateToSave,
    };

    try {
      await fetch(`/api/users/${selectedUserId}/pharmacology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pharmaData),
      });
      setShowNewPharmaDialog(false);
      setSelectedPharma(null);
      setPharmaQuery('');
      fetchPharmacologyLogs(selectedUserId);
      fetchDashboardData(selectedUserId);
    } catch (error) {
      console.error('Error creating pharmacology log:', error);
    }
  };

  const createBiomarkerLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUserId) return;

    const formData = new FormData(e.currentTarget);
    const biomarkers: Record<string, number> = {};

    ['CPK_UL', 'Phase_Angle', 'HbA1c_percent', 'LDH_UL', 'Cortisol_mcg_dL', 'Testosterone_ng_dL'].forEach(key => {
      const value = formData.get(key);
      if (value) {
        biomarkers[key] = parseFloat(value as string);
      }
    });

    const biomarkerData = {
      testDate: formData.get('testDate'),
      testType: formData.get('testType'),
      biomarkers,
      fastingStatus: formData.get('fastingStatus') === 'on',
      postWorkout: formData.get('postWorkout') === 'on',
      hydrationLevel: formData.get('hydrationLevel'),
    };

    try {
      await fetch(`/api/users/${selectedUserId}/biomarkers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(biomarkerData),
      });
      setShowNewBiomarkerDialog(false);
      fetchBiomarkerLogs(selectedUserId);
      fetchDashboardData(selectedUserId);
    } catch (error) {
      console.error('Error creating biomarker log:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserColor = (id: string) => {
    const colors = [
      'from-cyan-400 to-green-400',
      'from-purple-400 to-pink-400',
      'from-orange-400 to-red-400',
      'from-blue-400 to-cyan-400',
      'from-green-400 to-emerald-400',
    ];
    const index = users.findIndex(u => u.id === id);
    return colors[index % colors.length];
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'safe':
        return 'badge-neon-green';
      case 'moderate':
        return 'badge-neon-orange';
      case 'high':
        return 'badge-neon-orange';
      case 'very_high':
        return 'badge-neon-red';
      default:
        return 'badge-neon-blue';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'safe': return 'Zona Segura';
      case 'moderate': return 'Atenção';
      case 'high': return 'Risco Moderado';
      case 'very_high': return 'Alto Risco';
      default: return level;
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Generate chart data
  const tonnageChartData = trainingSessions
    .slice()
    .reverse()
    .map(s => ({
      date: new Date(s.sessionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      tonnage: s.totalTonnage || 0,
    }));

  const acwrChartData = trainingSessions
    .slice()
    .reverse()
    .map(s => ({
      date: new Date(s.sessionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      acwr: s.acwrRatio || 0,
      limite: 1.5,
    }));

  const conditions = dashboardData?.user?.conditions || [];
  const activeMeds = pharmacologyLogs.filter(log => (log.pharmacokinetics?.remainingPercentage || 0) > 0).slice(0, 5);

  // Generate pharmacokinetic chart data
  const generatePharmaData = (dose: number, halfLife: number) => {
    const data: { hour: string; concentration: number }[] = [];
    for (let i = 0; i < 49; i += 2) {
      const concentration = dose > 0 && halfLife > 0 ? dose * Math.pow(0.5, i / halfLife) : 0;
      data.push({ hour: `${i}h`, concentration });
    }
    return data;
  };

  const pharmaChartData = activeMeds.length > 0 
    ? generatePharmaData(activeMeds[0].dosageMg, activeMeds[0].halfLifeHours) 
    : generatePharmaData(0, 8);

  // Get alerts for selected user
  const getUserAlerts = () => {
    const alerts: { type: 'critical' | 'warning' | 'success'; title: string; message: string }[] = [];
    if (!dashboardData || !dashboardData.metrics) return alerts;

    const training = dashboardData.metrics.training;
    if (training && training.acwr && training.acwr.ratio) {
      if (training.acwr.ratio > 1.5) {
        alerts.push({
          type: 'critical' as const,
          title: 'ACWR Crítico',
          message: `ACWR em ${training.acwr.ratio.toFixed(2)} - Risco elevado de overtraining`,
        });
      } else if (training.acwr.ratio > 1.2) {
        alerts.push({
          type: 'warning' as const,
          title: 'ACWR Atenção',
          message: `ACWR em ${training.acwr.ratio.toFixed(2)} - Monitorar carga`,
        });
      }
    }

    if (dashboardData.metrics.biomarkers?.biomarkers) {
      try {
        const biomarkers = JSON.parse(dashboardData.metrics.biomarkers.biomarkers);
        if (biomarkers.CPK_UL > 400) {
          alerts.push({
            type: 'warning' as const,
            title: 'CPK Elevado',
            message: `Creatinofosfoquinase em ${biomarkers.CPK_UL} U/L - Monitorar recuperação`,
          });
        }
        if (biomarkers.Phase_Angle < 5.5) {
          alerts.push({
            type: 'warning' as const,
            title: 'Ângulo de Fase Baixo',
            message: `Ângulo de fase em ${biomarkers.Phase_Angle}° - Verificar hidratação e nutrição`,
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (dashboardData.riskFactors && dashboardData.riskFactors.length > 0) {
      dashboardData.riskFactors.forEach(factor => {
        alerts.push({
          type: 'warning' as const,
          title: 'Fator de Risco',
          message: factor,
        });
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        type: 'success' as const,
        title: 'Status Ótimo',
        message: 'Todos os parâmetros dentro do normal',
      });
    }

    return alerts;
  };

  const userAlerts = getUserAlerts();

  // Safe access to training data
  const training = dashboardData?.metrics?.training;
  const totalTonnage = training?.totalTonnage || 0;
  const currentWeekTonnage = training?.currentWeekTonnage || 0;
  const acwrRatio = training?.acwr?.ratio || 0;
  const acwrRiskLevel = training?.acwr?.riskLevel || 'safe';
  const avgINOL = training?.avgINOL || 0;
  const wellnessScore = dashboardData?.metrics?.readiness?.wellnessScore;

  // Data hoisted above

  const SidebarItem = ({ section, icon, label }: { section: SectionType; icon: React.ReactNode; label: React.ReactNode }) => (
    <button
      onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-3 ${
        activeSection === section
          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400'
          : 'text-gray-400 border-transparent hover:bg-cyan-500/5 hover:text-cyan-400'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-gray-100 grid-pattern flex">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#111827] border border-[#1f2937] rounded-lg text-cyan-400"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Toggle Button for Desktop */}
      <button
        className="hidden lg:flex fixed top-4 left-4 z-50 p-2 bg-[#111827] border border-[#1f2937] rounded-lg text-cyan-400 hover:bg-[#1f2937] transition-all"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Esconder Sidebar" : "Mostrar Sidebar"}
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-72 z-40 flex-shrink-0
        bg-gradient-to-b from-[#111827]/98 to-[#0a0f1c]/99
        border-r border-[#1f2937]
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-[260px]'}
      `}>
        <div className="p-6 border-b border-[#1f2937]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-green-400 flex items-center justify-center">
                <BrainCircuit className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">Nexus Core</h1>
                <p className="text-xs text-gray-400">Dashboard Clínico</p>
              </div>
            </div>
            <button
              className="lg:hidden p-1 hover:bg-[#1f2937] rounded text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Selector in Sidebar */}
        <div className="p-4 border-b border-[#1f2937]">
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#0d1117] border border-[#1f2937] rounded-lg hover:border-cyan-400 transition-all text-left"
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${selectedUser ? getUserColor(selectedUser.id) : 'from-gray-400 to-gray-500'} flex items-center justify-center text-white font-bold`}>
                {selectedUser ? getInitials(selectedUser.name) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{selectedUser?.name || 'Selecionar Aluno'}</p>
                <p className="text-gray-400 text-xs truncate">{selectedUser?.email || 'Escolha um aluno'}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-[#1f2937] rounded-lg max-h-64 overflow-y-auto z-50 shadow-xl">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cyan-500/5 transition-colors ${
                      selectedUserId === user.id ? 'bg-cyan-500/10' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getUserColor(user.id)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{user.name}</p>
                      <p className="text-gray-400 text-xs truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="py-2 flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Menu Principal</p>
          </div>
          <SidebarItem section="overview" icon={<Activity className="w-5 h-5" />} label="Visão Geral" />
          <SidebarItem section="treino" icon={<Dumbbell className="w-5 h-5" />} label="Registrar Treino" />
          <SidebarItem section="farmaco" icon={<Pill className="w-5 h-5" />} label="Registrar Medicação" />
          <SidebarItem section="biomarcadores" icon={<TestTube className="w-5 h-5" />} label="Registrar Exames" />
          
          <div className="px-3 py-2 mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Sistema</p>
          </div>
          <SidebarItem
            section="alertas"
            icon={<AlertCircle className="w-5 h-5" />}
            label={
              <span className="flex items-center justify-between w-full">
                <span>Alertas</span>
                {userAlerts.filter(a => a.type !== 'success').length > 0 && (
                  <span className="badge-neon-red text-xs">
                    {userAlerts.filter(a => a.type !== 'success').length}
                  </span>
                )}
              </span>
            }
          />
          <SidebarItem section="usuarios" icon={<User className="w-5 h-5" />} label="Gerenciar Alunos" />
          <SidebarItem section="config" icon={<Settings className="w-5 h-5" />} label="Configurações" />

          {/* New User Button */}
          <div className="p-3 mt-4">
            <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
              <DialogTrigger asChild>
                <button className="w-full cyber-btn flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Aluno
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#111827] border-[#1f2937] text-white">
                <DialogHeader>
                  <DialogTitle>👥 Novo Aluno</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Preencha os dados biométricos básicos do atleta
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createUser} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Nome *</Label>
                    <Input id="name" name="name" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email *</Label>
                    <Input id="email" name="email" type="email" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="heightCm" className="text-gray-300">Altura (cm)</Label>
                      <Input id="heightCm" name="heightCm" type="number" className="bg-[#0d1117] border-[#1f2937] text-white" />
                    </div>
                    <div>
                      <Label htmlFor="weightKg" className="text-gray-300">Peso (kg)</Label>
                      <Input id="weightKg" name="weightKg" type="number" step="0.1" className="bg-[#0d1117] border-[#1f2937] text-white" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="trainingLevel" className="text-gray-300">Nível de Treinamento</Label>
                    <Select name="trainingLevel">
                      <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-[#1f2937]">
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full cyber-btn">
                    Criar Aluno
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </nav>

        <div className="p-4 border-t border-[#1f2937]">
          <div className="cyber-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="status-indicator status-online"></div>
              <span className="text-sm text-gray-300">Sistema Online</span>
            </div>
            <div className="text-xs text-gray-400">
              <p>API Status: <span className="text-green-400">Operacional</span></p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-4 lg:p-8 transition-all duration-300 ${sidebarOpen ? '' : 'lg:ml-0'}`}>
        {/* Page Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {activeSection === 'overview' ? 'Visão Geral' :
               activeSection === 'treino' ? 'Registrar Treino' :
               activeSection === 'farmaco' ? 'Registrar Medicação' :
               activeSection === 'biomarcadores' ? 'Registrar Exames' :
               activeSection === 'alertas' ? 'Central de Alertas' :
               activeSection === 'usuarios' ? 'Gerenciar Alunos' :
               'Configurações'}
            </h1>
            <p className="text-gray-400 text-sm">
              {selectedUser ? `Monitorando: ${selectedUser.name}` : 'Selecione um aluno para começar'}
            </p>
          </div>
          
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button className="cyber-btn lg:hidden">
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
          </Dialog>
        </header>

        {/* Content Sections */}
        {usersLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Carregando alunos...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] cyber-card m-4 border-dashed border-2">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Bem-vindo ao Nexus Core</h2>
            <p className="text-gray-400 mb-6 text-center max-w-md">Não há alunos cadastrados no sistema. Adicione seu primeiro aluno para começar a monitorar os treinos e métricas.</p>
            <Button onClick={() => setShowNewUserDialog(true)} className="cyber-btn">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Aluno
            </Button>
          </div>
        ) : !selectedUser ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Selecione um aluno na barra lateral...</p>
          </div>
        ) : loading && !dashboardData ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Carregando métricas do dashboard...</p>
          </div>
        ) : (
          <>
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* User Info Card */}
                <div className="cyber-card p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getUserColor(selectedUser.id)} flex items-center justify-center text-white font-bold text-2xl`}>
                        {getInitials(selectedUser.name)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                        <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="badge-neon-green">Ativo</span>
                          <span className="badge-neon-blue">Premium</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <Dialog open={showNewConditionDialog} onOpenChange={setShowNewConditionDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                            <Plus className="h-4 w-4 mr-1" />
                            Condição Clínica (CID)
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#111827] border-[#1f2937] text-white overflow-visible">
                          <DialogHeader>
                            <DialogTitle>🏥 Adicionar Condição Clínica</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Busca inteligente via CID-10 (National Library of Medicine)
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={createCondition} className="space-y-4">
                            <div className="space-y-2 relative">
                              <Label htmlFor="clinicalSearch" className="text-gray-300">Diagnóstico (Inglês ou Código)</Label>
                              <div className="relative">
                                <Input 
                                  id="clinicalSearch" 
                                  value={clinicalQuery}
                                  onChange={(e) => {
                                    setClinicalQuery(e.target.value);
                                    setSelectedCondition(null);
                                  }}
                                  placeholder="Ex: Diabetes, Hypertension..." 
                                  className="bg-[#0d1117] border-[#1f2937] text-white" 
                                />
                                {isSearchingClinical && (
                                  <div className="absolute right-3 top-3 w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                                )}
                              </div>
                              
                              {/* Autocomplete Results */}
                              {clinicalQuery.length >= 3 && !selectedCondition && clinicalResults.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-[#1f2937] border border-gray-600 rounded-md shadow-xl max-h-48 overflow-auto">
                                  {clinicalResults.map((result, idx) => (
                                    <div 
                                      key={idx} 
                                      className="p-3 hover:bg-cyan-500/20 cursor-pointer text-sm border-b border-gray-700 last:border-0 transition-colors"
                                      onClick={() => {
                                        setSelectedCondition(result);
                                        setClinicalQuery(`${result.code} - ${result.name}`);
                                        setClinicalResults([]);
                                      }}
                                    >
                                      <span className="font-bold text-cyan-400 mr-2">{result.code}</span>
                                      <span className="text-gray-200">{result.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="conditionType" className="text-gray-300">Tipo da Condição</Label>
                                <Select name="conditionType" disabled={!selectedCondition}>
                                  <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#111827] border-[#1f2937]">
                                    <SelectItem value="chronic">Crônica</SelectItem>
                                    <SelectItem value="injury">Lesão/Ortopédica</SelectItem>
                                    <SelectItem value="illness">Doença Aguda</SelectItem>
                                    <SelectItem value="other">Outro</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="severity" className="text-gray-300">Gravidade</Label>
                                <Select name="severity" disabled={!selectedCondition}>
                                  <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#111827] border-[#1f2937]">
                                    <SelectItem value="mild">Leve</SelectItem>
                                    <SelectItem value="moderate">Moderada</SelectItem>
                                    <SelectItem value="severe">Grave</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button type="submit" disabled={!selectedCondition} className="w-full cyber-btn mt-4">
                              Confirmar Diagnóstico
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <div>
                        <p className="text-gray-400 text-sm">Treinos Registrados</p>
                        <p className="text-white font-mono text-xl text-right">{selectedUser._count?.trainingSessions || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="cyber-card stat-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold gradient-text">
                      {totalTonnage.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Tonagem Total (kg)</div>
                    <div className="text-xs text-green-400 mt-1">
                      Semana atual: {currentWeekTonnage.toLocaleString()} kg
                    </div>
                  </div>

                  <div className="cyber-card stat-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold gradient-text">
                      {acwrRatio.toFixed(2)}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">ACWR</div>
                    <span className={getRiskBadgeColor(acwrRiskLevel)}>
                      {getRiskLabel(acwrRiskLevel)}
                    </span>
                  </div>

                  <div className="cyber-card stat-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold gradient-text">
                      {avgINOL.toFixed(3)}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">INOL Médio</div>
                    <div className="text-xs text-green-400 mt-1">Fadiga Neural</div>
                  </div>

                  <div className="cyber-card stat-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="text-2xl font-bold gradient-text">
                      {wellnessScore?.toFixed(1) || 'N/A'}/10
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Wellness Score</div>
                    <div className="text-xs text-green-400 mt-1">Prontidão Diária</div>
                  </div>
                </div>

                {/* Condições e Medicações (Ação Medicamentosa) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Patologias */}
                  <div className="cyber-card p-6 border-l-4 border-l-cyan-500/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      Condições Clínicas (CID)
                    </h3>
                    <div className="space-y-3">
                      {conditions.length > 0 ? conditions.map((cond: any) => (
                        <div key={cond.id} className="flex justify-between items-center p-3 bg-[#0d1117] rounded-md border border-[#1f2937]">
                          <span className="text-gray-200 font-medium text-sm flex-1">{cond.conditionName}</span>
                          <span className={
                            cond.severity === 'mild' ? 'badge-neon-green ml-2 whitespace-nowrap' : 
                            cond.severity === 'moderate' ? 'badge-neon-orange ml-2 whitespace-nowrap' : 
                            'badge-neon-red ml-2 whitespace-nowrap'
                          }>
                            {cond.severity === 'mild' ? 'Leve' : cond.severity === 'moderate' ? 'Moderada' : 'Grave'}
                          </span>
                        </div>
                      )) : (
                        <p className="text-gray-500 text-sm">Nenhuma condição clínica (CID) registrada.</p>
                      )}
                    </div>
                  </div>

                  {/* Medicamentos Ativos */}
                  <div className="cyber-card p-6 border-l-4 border-l-purple-500/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-400" />
                      Ação Medicamentosa Ativa
                    </h3>
                    <div className="space-y-3">
                      {activeMeds.length > 0 ? activeMeds.map((med) => (
                        <div key={med.id} className="flex justify-between items-center p-3 bg-[#0d1117] rounded-md border border-[#1f2937]">
                          <div className="flex-1 pr-4">
                            <span className="text-gray-200 font-medium block truncate" title={med.substanceName}>{med.substanceName}</span>
                            <span className="text-gray-400 text-xs text-muted-foreground block mt-1">Dose: {med.dosageMg}mg | {new Date(med.administrationDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <span className="text-purple-400 font-bold block">{med.pharmacokinetics?.remainingPercentage?.toFixed(1) || '0.0'}%</span>
                            <span className="text-gray-500 text-[10px]">No plasma</span>
                          </div>
                        </div>
                      )) : (
                        <p className="text-gray-500 text-sm">Nenhum medicamento com ação ativa detectado no momento.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Alertas do Aluno
                  </h3>
                  <div className="space-y-3">
                    {userAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className={
                          alert.type === 'critical' ? 'alert-card-critical' :
                          alert.type === 'warning' ? 'alert-card-warning' :
                          'alert-card-success'
                        }
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">
                            {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : '✓'}
                          </span>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{alert.title}</p>
                            <p className="text-gray-400 text-sm">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="cyber-card p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Evolução da Tonagem</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tonnageChartData}>
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" fontSize={12} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                            labelStyle={{ color: '#e5e7eb' }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="tonnage"
                            stroke="#00f5ff"
                            strokeWidth={2}
                            dot={{ fill: '#00f5ff', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="cyber-card p-6">
                    <h3 className="text-lg font-bold text-white mb-4">ACWR - Workload Ratio</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={acwrChartData}>
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 2]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                            labelStyle={{ color: '#e5e7eb' }}
                          />
                          <Legend />
                          <ReferenceLine y={1.5} stroke="#ff4757" strokeDasharray="5 5" />
                          <Line
                            type="monotone"
                            dataKey="acwr"
                            stroke="#00ff88"
                            strokeWidth={2}
                            dot={{ fill: '#00ff88', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="cyber-card p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Atividade Recente</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {trainingSessions.slice(0, 5).map((session, index) => (
                      <div key={session.id} className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-[#1f2937]">
                        <div>
                          <p className="text-white font-medium">
                            {session.sessionType || 'Treino'} • {session.modality || 'Geral'}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {new Date(session.sessionDate).toLocaleDateString('pt-BR')} •
                            Tonagem: {session.totalTonnage?.toFixed(0) || 0} kg
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">INOL: {session.inolScore?.toFixed(3) || '0.000'}</p>
                          {session.acwrRatio && (
                            <span className={getRiskBadgeColor(
                              session.acwrRatio > 1.5 ? 'very_high' :
                              session.acwrRatio > 1.2 ? 'high' : 'safe'
                            )}>
                              ACWR: {session.acwrRatio.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {trainingSessions.length === 0 && (
                      <p className="text-gray-400 text-center py-8">Nenhuma sessão registrada</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Training Section */}
            {activeSection === 'treino' && (
              <div className="cyber-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">🏋️ Registrar Sessão de Treino</h2>
                  <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
                    <DialogTrigger asChild>
                      <Button className="cyber-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Sessão
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111827] border-[#1f2937] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>🏋️ Registrar Nova Sessão de Treino</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          O sistema calculará automaticamente Tonagem, INOL e ACWR
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={createTrainingSession} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="sessionDate" className="text-gray-300">Data</Label>
                            <Input id="sessionDate" name="sessionDate" type="date" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                          </div>
                          <div>
                            <Label htmlFor="sessionType" className="text-gray-300">Tipo de Sessão</Label>
                            <Select name="sessionType">
                              <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111827] border-[#1f2937]">
                                <SelectItem value="strength">Força</SelectItem>
                                <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
                                <SelectItem value="endurance">Resistência</SelectItem>
                                <SelectItem value="power">Potência</SelectItem>
                                <SelectItem value="recovery">Recuperação</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="modality" className="text-gray-300">Modalidade</Label>
                          <Select name="modality">
                            <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111827] border-[#1f2937]">
                              <SelectItem value="resistance">Musculação</SelectItem>
                              <SelectItem value="cardio">Cardio</SelectItem>
                              <SelectItem value="mixed">Misto</SelectItem>
                              <SelectItem value="functional">Funcional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="border border-[#1f2937] rounded-lg p-4 space-y-3">
                          <Label className="text-base font-semibold text-white">Exercício Principal</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-3">
                              <Label htmlFor="exercise1_name" className="text-gray-300">Nome do Exercício</Label>
                              <Input id="exercise1_name" name="exercise1_name" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="exercise1_sets" className="text-gray-300">Séries</Label>
                              <Input id="exercise1_sets" name="exercise1_sets" type="number" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="exercise1_reps" className="text-gray-300">Repetições</Label>
                              <Input id="exercise1_reps" name="exercise1_reps" type="number" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="exercise1_load" className="text-gray-300">Carga (kg)</Label>
                              <Input id="exercise1_load" name="exercise1_load" type="number" step="0.5" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="exercise1_percent" className="text-gray-300">% 1RM (opcional)</Label>
                              <Input id="exercise1_percent" name="exercise1_percent" type="number" step="1" className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="perceivedEffort" className="text-gray-300">Esforço Percebido (1-10)</Label>
                          <Input id="perceivedEffort" name="perceivedEffort" type="number" min="1" max="10" className="bg-[#0d1117] border-[#1f2937] text-white" />
                        </div>
                        <Button type="submit" className="w-full cyber-btn">
                          Registrar Sessão
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {trainingSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-[#1f2937]">
                      <div>
                        <div className="font-medium text-white">
                          {new Date(session.sessionDate).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-sm text-gray-400">
                          {session.sessionType} • {session.totalTonnage?.toFixed(0) || 0} kg
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">INOL: {session.inolScore?.toFixed(3)}</div>
                        {session.acwrRatio && (
                          <span className={getRiskBadgeColor(
                            session.acwrRatio > 1.5 ? 'very_high' :
                            session.acwrRatio > 1.2 ? 'high' : 'safe'
                          )}>
                            ACWR: {session.acwrRatio.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {trainingSessions.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      Nenhuma sessão registrada
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pharmacology Section */}
            {activeSection === 'farmaco' && (
              <div className="cyber-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">💊 Registrar Medicação</h2>
                  <Dialog open={showNewPharmaDialog} onOpenChange={setShowNewPharmaDialog}>
                    <DialogTrigger asChild>
                      <Button className="cyber-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Log
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111827] border-[#1f2937] text-white overflow-visible">
                      <DialogHeader>
                        <DialogTitle>💊 Registrar Administração</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          O sistema calculará a concentração plasmática em tempo real baseado no OpenFDA
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={createPharmacologyLog} className="space-y-4">
                        <div className="space-y-2 relative">
                          <Label htmlFor="pharmaSearch" className="text-gray-300">Medicamento (OpenFDA) *</Label>
                          <div className="relative">
                            <Input 
                              id="pharmaSearch" 
                              value={pharmaQuery}
                              onChange={(e) => {
                                setPharmaQuery(e.target.value);
                                setSelectedPharma(null);
                              }}
                              placeholder="Ex: Ibuprofen, Amphetamine..." 
                              required={!selectedPharma}
                              className="bg-[#0d1117] border-[#1f2937] text-white" 
                            />
                            {isSearchingPharma && (
                              <div className="absolute right-3 top-3 w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                            )}
                          </div>
                          
                          {/* Autocomplete Results */}
                          {pharmaQuery.length >= 3 && !selectedPharma && pharmaResults.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-[#1f2937] border border-gray-600 rounded-md shadow-xl max-h-48 overflow-auto">
                              {pharmaResults.map((result, idx) => (
                                <div 
                                  key={idx} 
                                  className="p-3 hover:bg-cyan-500/20 cursor-pointer text-sm border-b border-gray-700 last:border-0 transition-colors"
                                  onClick={() => {
                                    setSelectedPharma(result);
                                    setPharmaQuery(`${result.brand_name} (${result.generic_name})`);
                                    setPharmaResults([]);
                                  }}
                                >
                                  <span className="font-bold text-cyan-400 mr-2">{result.brand_name}</span>
                                  <span className="text-gray-200 block text-xs mt-1">{result.generic_name}</span>
                                  <span className="text-gray-400 text-xs">{result.dosage_form}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="substanceType" className="text-gray-300">Tipo</Label>
                            <Select name="substanceType" disabled={!selectedPharma}>
                              <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111827] border-[#1f2937]">
                                <SelectItem value="medication">Medicamento</SelectItem>
                                <SelectItem value="supplement">Suplemento</SelectItem>
                                <SelectItem value="hormone">Hormônio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="dosageMg" className="text-gray-300">Dosagem (mg) *</Label>
                            <Input id="dosageMg" name="dosageMg" type="number" step="0.1" required disabled={!selectedPharma} className="bg-[#0d1117] border-[#1f2937] text-white" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="halfLifeHours" className="text-gray-300">Meia-vida (horas) *</Label>
                            <Input id="halfLifeHours" name="halfLifeHours" type="number" step="0.1" required disabled={!selectedPharma} className="bg-[#0d1117] border-[#1f2937] text-white" />
                          </div>
                          <div>
                            <Label htmlFor="administrationDate" className="text-gray-300">Data/Hora</Label>
                            <Input id="administrationDate" name="administrationDate" type="datetime-local" disabled={!selectedPharma} className="bg-[#0d1117] border-[#1f2937] text-white" />
                          </div>
                        </div>
                        <Button type="submit" disabled={!selectedPharma} className="w-full cyber-btn mt-4">
                          Registrar
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Pharmacokinetics Chart */}
                <div className="cyber-card p-4 mb-6">
                  <h4 className="text-white font-semibold mb-3">Previsão de Concentração Plasmática</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pharmaChartData}>
                        <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                          labelStyle={{ color: '#e5e7eb' }}
                          formatter={(value: number) => [`${value.toFixed(1)} mg`, 'Concentração']}
                        />
                        <Line
                          type="monotone"
                          dataKey="concentration"
                          stroke="#b983ff"
                          strokeWidth={2}
                          dot={false}
                          fill="url(#colorPharma)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Fórmula: C(t) = C₀ × (1/2)^(t / t_meia)
                  </p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pharmacologyLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-[#1f2937]">
                      <div>
                        <div className="font-medium text-white">{log.substanceName}</div>
                        <div className="text-sm text-gray-400">
                          {log.dosageMg}mg • Meia-vida: {log.halfLifeHours}h
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {log.pharmacokinetics?.remainingPercentage?.toFixed(1) || '0.0'}% ativo
                        </div>
                        <span className={
                          log.pharmacokinetics?.peakImpactLevel === 'high' ? 'badge-neon-red' :
                          log.pharmacokinetics?.peakImpactLevel === 'moderate' ? 'badge-neon-orange' :
                          'badge-neon-green'
                        }>
                          {log.pharmacokinetics?.peakImpactLevel === 'high' ? 'Alto Impacto' :
                           log.pharmacokinetics?.peakImpactLevel === 'moderate' ? 'Médio Impacto' :
                           log.pharmacokinetics?.peakImpactLevel === 'low' ? 'Baixo Impacto' : 
                           'Ação Residual'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {pharmacologyLogs.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      Nenhum log farmacológico registrado
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Biomarkers Section */}
            {activeSection === 'biomarcadores' && (
              <div className="cyber-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">📈 Registrar Exames/Biomarcadores</h2>
                  <Dialog open={showNewBiomarkerDialog} onOpenChange={setShowNewBiomarkerDialog}>
                    <DialogTrigger asChild>
                      <Button className="cyber-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Exame
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111827] border-[#1f2937] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>📈 Registrar Exames</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          O sistema analisará os biomarcadores e fornecerá recomendações
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={createBiomarkerLog} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="testDate" className="text-gray-300">Data do Exame</Label>
                            <Input id="testDate" name="testDate" type="date" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                          </div>
                          <div>
                            <Label htmlFor="testType" className="text-gray-300">Tipo</Label>
                            <Select name="testType">
                              <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111827] border-[#1f2937]">
                                <SelectItem value="blood_work">Hemograma/Bioquímica</SelectItem>
                                <SelectItem value="bioimpedance">Bioimpedância</SelectItem>
                                <SelectItem value="combined">Combinado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="border border-[#1f2937] rounded-lg p-4 space-y-3">
                          <Label className="text-base font-semibold text-white">Biomarcadores Principais</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="CPK_UL" className="text-gray-300">CPK (U/L)</Label>
                              <Input id="CPK_UL" name="CPK_UL" type="number" step="1" placeholder="Normal: 10-200" className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="Phase_Angle" className="text-gray-300">Ângulo de Fase (°)</Label>
                              <Input id="Phase_Angle" name="Phase_Angle" type="number" step="0.1" placeholder="Normal: 5-7" className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="HbA1c_percent" className="text-gray-300">HbA1c (%)</Label>
                              <Input id="HbA1c_percent" name="HbA1c_percent" type="number" step="0.1" placeholder="Normal: < 5.7" className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="LDH_UL" className="text-gray-300">LDH (U/L)</Label>
                              <Input id="LDH_UL" name="LDH_UL" type="number" step="1" placeholder="Normal: 140-280" className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="Cortisol_mcg_dL" className="text-gray-300">Cortisol (mcg/dL)</Label>
                              <Input id="Cortisol_mcg_dL" name="Cortisol_mcg_dL" type="number" step="0.1" placeholder="Normal: 6-23" className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                            <div>
                              <Label htmlFor="Testosterone_ng_dL" className="text-gray-300">Testosterona (ng/dL)</Label>
                              <Input id="Testosterone_ng_dL" name="Testosterone_ng_dL" type="number" step="1" placeholder="Varia por idade/gênero" className="bg-[#0d1117] border-[#1f2937] text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="fastingStatus" name="fastingStatus" className="bg-[#0d1117] border-[#1f2937]" />
                            <Label htmlFor="fastingStatus" className="text-gray-300 text-sm">Jejum</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="postWorkout" name="postWorkout" className="bg-[#0d1117] border-[#1f2937]" />
                            <Label htmlFor="postWorkout" className="text-gray-300 text-sm">Pós-treino</Label>
                          </div>
                          <div>
                            <Select name="hydrationLevel">
                              <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                                <SelectValue placeholder="Hidratação" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111827] border-[#1f2937]">
                                <SelectItem value="optimal">Ótima</SelectItem>
                                <SelectItem value="adequate">Adequada</SelectItem>
                                <SelectItem value="dehydrated">Desidratado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button type="submit" className="w-full cyber-btn">
                          Registrar Exame
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {biomarkerLogs.map((log) => {
                    let biomarkersParsed: Record<string, number> | null = null;
                    try {
                      biomarkersParsed = JSON.parse(log.biomarkers);
                    } catch (e) {}
                    return (
                      <div key={log.id} className="p-4 bg-[#0d1117] rounded-lg border border-[#1f2937]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-white">
                            {new Date(log.testDate).toLocaleDateString('pt-BR')}
                          </div>
                          <span className="badge-neon-blue">{log.testType || 'Exame'}</span>
                        </div>
                        {biomarkersParsed && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {biomarkersParsed.CPK_UL && (
                              <div className="text-gray-400">CPK: <span className="text-white">{biomarkersParsed.CPK_UL} U/L</span></div>
                            )}
                            {biomarkersParsed.Phase_Angle && (
                              <div className="text-gray-400">Ângulo Fase: <span className="text-white">{biomarkersParsed.Phase_Angle}°</span></div>
                            )}
                            {biomarkersParsed.HbA1c_percent && (
                              <div className="text-gray-400">HbA1c: <span className="text-white">{biomarkersParsed.HbA1c_percent}%</span></div>
                            )}
                            {biomarkersParsed.Testosterone_ng_dL && (
                              <div className="text-gray-400">Testosterona: <span className="text-white">{biomarkersParsed.Testosterone_ng_dL} ng/dL</span></div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {biomarkerLogs.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      Nenhum exame registrado
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alerts Section */}
            {activeSection === 'alertas' && (
              <div className="cyber-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">🚨 Central de Alertas</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-[#1f2937] text-gray-300 hover:bg-[#1f2937]">
                      Todos
                    </Button>
                    <Button variant="outline" className="border-[#1f2937] text-gray-300 hover:bg-[#1f2937]">
                      Críticos
                    </Button>
                    <Button variant="outline" className="border-[#1f2937] text-gray-300 hover:bg-[#1f2937]">
                      Atenção
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {userAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className={
                        alert.type === 'critical' ? 'alert-card-critical' :
                        alert.type === 'warning' ? 'alert-card-warning' :
                        'alert-card-success'
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getUserColor(selectedUserId!)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                            {getInitials(selectedUser?.name || '')}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{selectedUser?.name} - {alert.title}</p>
                            <p className="text-gray-400 text-sm">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {userAlerts.length === 0 && (
                    <div className="alert-card-success">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-white font-semibold">Sem Alertas</p>
                          <p className="text-sm text-gray-400">Todos os parâmetros dentro do normal</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Section */}
            {activeSection === 'usuarios' && (
              <div className="cyber-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">👥 Gerenciar Alunos</h2>
                  <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
                    <DialogTrigger asChild>
                      <Button className="cyber-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Aluno
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111827] border-[#1f2937] text-white">
                      <DialogHeader>
                        <DialogTitle>👥 Novo Aluno</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Preencha os dados biométricos básicos do atleta
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={createUser} className="space-y-4">
                        <div>
                          <Label htmlFor="name" className="text-gray-300">Nome *</Label>
                          <Input id="name" name="name" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-gray-300">Email *</Label>
                          <Input id="email" name="email" type="email" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="heightCm" className="text-gray-300">Altura (cm)</Label>
                            <Input id="heightCm" name="heightCm" type="number" className="bg-[#0d1117] border-[#1f2937] text-white" />
                          </div>
                          <div>
                            <Label htmlFor="weightKg" className="text-gray-300">Peso (kg)</Label>
                            <Input id="weightKg" name="weightKg" type="number" step="0.1" className="bg-[#0d1117] border-[#1f2937] text-white" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="trainingLevel" className="text-gray-300">Nível de Treinamento</Label>
                          <Select name="trainingLevel">
                            <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111827] border-[#1f2937]">
                              <SelectItem value="beginner">Iniciante</SelectItem>
                              <SelectItem value="intermediate">Intermediário</SelectItem>
                              <SelectItem value="advanced">Avançado</SelectItem>
                              <SelectItem value="elite">Elite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full cyber-btn">
                          Criar Aluno
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f2937]">
                        <th className="text-left py-3 px-4 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                          Aluno
                        </th>
                        <th className="text-left py-3 px-4 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                          Treinos
                        </th>
                        <th className="text-left py-3 px-4 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-[#1f2937] hover:bg-cyan-500/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getUserColor(user.id)} flex items-center justify-center text-white text-sm font-bold`}>
                                {getInitials(user.name)}
                              </div>
                              <span className="text-white">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-400">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className="badge-neon-green">Ativo</span>
                          </td>
                          <td className="py-3 px-4 text-white font-mono">
                            {user._count?.trainingSessions || 0}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#1f2937] text-cyan-400 hover:bg-cyan-500/10"
                              onClick={() => { setSelectedUserId(user.id); setActiveSection('overview'); }}
                            >
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Config Section */}
            {activeSection === 'config' && (
              <div className="cyber-card p-6">
                <h2 className="text-xl font-bold text-white mb-6">⚙️ Configurações do Sistema</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Parâmetros do Modelo</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Limite ACWR (Alerta)</Label>
                        <Input type="number" defaultValue={1.5} step="0.1" className="bg-[#0d1117] border-[#1f2937] text-white" />
                      </div>
                      <div>
                        <Label className="text-gray-300">Limite INOL Diário</Label>
                        <Input type="number" defaultValue={1.0} step="0.1" className="bg-[#0d1117] border-[#1f2937] text-white" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Integrações</h3>
                    <div className="space-y-4">
                      <div className="cyber-card p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">SQLite Database</p>
                          <p className="text-gray-400 text-sm">Banco de dados principal</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="status-indicator status-online"></div>
                          <span className="text-green-400 text-sm">Conectado</span>
                        </div>
                      </div>
                      <div className="cyber-card p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">API Endpoints</p>
                          <p className="text-gray-400 text-sm">REST API ativa</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="status-indicator status-online"></div>
                          <span className="text-green-400 text-sm">Operacional</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Button className="cyber-btn">
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedUser && (
          <div className="cyber-card p-12 text-center">
            <BrainCircuit className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
            <h2 className="text-xl font-bold text-white mb-2">Bem-vindo ao Nexus Core</h2>
            <p className="text-gray-400 mb-6">
              Selecione ou crie um usuário para começar a monitorar métricas clínicas
            </p>
            <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
              <DialogTrigger asChild>
                <Button className="cyber-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111827] border-[#1f2937] text-white">
                <DialogHeader>
                  <DialogTitle>👥 Novo Aluno</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Preencha os dados biométricos básicos do atleta
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createUser} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Nome *</Label>
                    <Input id="name" name="name" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email *</Label>
                    <Input id="email" name="email" type="email" required className="bg-[#0d1117] border-[#1f2937] text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="heightCm" className="text-gray-300">Altura (cm)</Label>
                      <Input id="heightCm" name="heightCm" type="number" className="bg-[#0d1117] border-[#1f2937] text-white" />
                    </div>
                    <div>
                      <Label htmlFor="weightKg" className="text-gray-300">Peso (kg)</Label>
                      <Input id="weightKg" name="weightKg" type="number" step="0.1" className="bg-[#0d1117] border-[#1f2937] text-white" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="trainingLevel" className="text-gray-300">Nível de Treinamento</Label>
                    <Select name="trainingLevel">
                      <SelectTrigger className="bg-[#0d1117] border-[#1f2937] text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-[#1f2937]">
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full cyber-btn">
                    Criar Aluno
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>

      {/* Close dropdown on outside click */}
      {userDropdownOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setUserDropdownOpen(false)}
        />
      )}
    </div>
  );
}
