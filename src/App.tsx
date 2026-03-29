import { I18nProvider } from "./i18n/I18nContext";
import { ProfileProvider } from "./context/ProfileContext";
import { useProfiles } from "./hooks/useProfiles";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ProfileDetail } from "./components/ProfileDetail/ProfileDetail";
import { EmptyState } from "./components/EmptyState/EmptyState";

function MainContent() {
  const { selectedProfile } = useProfiles();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden">
        {selectedProfile ? <ProfileDetail /> : <EmptyState />}
      </main>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <ProfileProvider>
        <MainContent />
      </ProfileProvider>
    </I18nProvider>
  );
}

export default App;
