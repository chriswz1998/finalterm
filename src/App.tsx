import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/src/context/AppContext';
import { AppLayout } from '@/src/layout/AppLayout';
import { OnboardingPage } from '@/src/pages/OnboardingPage';
import { Dashboard } from '@/src/components/Dashboard';
import { TranslationBoard } from '@/src/components/TranslationBoard';
import { ClinicalHub } from '@/src/components/ClinicalHub';
import ProtocolHub from '@/src/components/ProtocolHub';
import { ArchiveCenter } from '@/src/components/ArchiveCenter';
import { InterpretNewReport } from '@/src/components/InterpretNewReport';
import { PrepareFollowup } from '@/src/components/PrepareFollowup';
import { AgentLayout } from '@/src/agent/layout/AgentLayout';
import { AgentHome } from '@/src/agent/pages/AgentHome';
import { AgentResultPage } from '@/src/agent/pages/AgentResultPage';
import { FamilyMembersPage } from '@/src/pages/FamilyMembersPage';
import { KnowledgeVersionPage } from '@/src/pages/KnowledgeVersionPage';
import { PrivacyPolicyPage } from '@/src/pages/PrivacyPolicyPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          <Route path="/agent" element={<AgentLayout />}>
            <Route index element={<AgentHome />} />
            <Route path="result/:sessionId" element={<AgentResultPage />} />
          </Route>

          <Route element={<AppLayout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/interpret" element={<InterpretNewReport />} />
            <Route path="/prepare" element={<PrepareFollowup />} />
            <Route path="/status" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/translation" element={<TranslationBoard />} />
            <Route path="/clinical" element={<ClinicalHub />} />
            <Route path="/protocol" element={<ProtocolHub />} />
            <Route path="/archive" element={<ArchiveCenter />} />
            <Route path="/members" element={<FamilyMembersPage />} />
            <Route path="/knowledge" element={<KnowledgeVersionPage />} />
            <Route path="/" element={<Navigate to="/onboarding" replace />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
