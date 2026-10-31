import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import { Header } from "./components/Header";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Candidates from "./pages/Candidates";
import Positions from "./pages/Positions";
import Applications from "./pages/Applications";
import Interviews from "./pages/Interviews";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import Login from "./pages/Login";

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [interviewFocusDate, setInterviewFocusDate] = useState(null);
  const [employeeFocus, setEmployeeFocus] = useState(null);
  const navigateTo = (tab, options = {}) => {
    setInterviewFocusDate(tab === "interviews" ? (options.date || null) : null);
    setEmployeeFocus(tab === "employees" ? (options.employee || null) : null);
    setCurrentTab(tab);
  };

  // Navigation Guard theo Role
  const isInterviewer = user?.role === "interviewer";
  const allowedTabsForInterviewer = ["dashboard", "interviews"];
  const safeTab = isInterviewer && !allowedTabsForInterviewer.includes(currentTab) ? "dashboard" : currentTab;

  const tabTitles = {
    dashboard: "Tổng Quan Tuyển Dụng & Thống Kê",
    candidates: "Quản Lý Hồ Sơ Ứng Viên",
    positions: "Quản Lý Vị Trí Tuyển Dụng",
    applications: "Quy Trình Tuyển Dụng Kanban",
    interviews: "Điều Phối & Đánh Giá Phỏng Vấn",
    employees: "Quản Lý Nhân Viên & Phòng Ban",
    reports: "Báo Cáo & Khai Thác Dữ Liệu Aggregation"
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (safeTab) {
      case "dashboard":
        return <Dashboard onNavigate={navigateTo} />;
      case "candidates":
        return <Candidates />;
      case "positions":
        return <Positions />;
      case "applications":
        return <Applications onNavigate={navigateTo} />;
      case "interviews":
        return <Interviews focusDate={interviewFocusDate} onNavigate={navigateTo} />;
      case "employees":
        return <Employees key={employeeFocus ? `${employeeFocus.candidateId}:${employeeFocus.positionId}` : "all"} focusEmployee={employeeFocus} onNavigate={navigateTo} />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-800 font-sans antialiased">
      <Sidebar currentTab={currentTab} setCurrentTab={navigateTo} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header currentTabTitle={tabTitles[safeTab]} />
        <nav className="md:hidden px-4 py-3 bg-white border-b border-slate-200" aria-label="Điều hướng chính">
          <select value={safeTab} onChange={(event) => navigateTo(event.target.value)} aria-label="Chọn màn hình"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {Object.entries(tabTitles).filter(([tab]) =>
              ["admin", "hr"].includes(user?.role) || (isInterviewer ? allowedTabsForInterviewer.includes(tab) : tab === "dashboard")
            ).map(([tab, title]) =>
              <option key={tab} value={tab}>{title}</option>
            )}
          </select>
        </nav>
        <div className={`p-4 md:p-8 flex-1 w-full mx-auto ${safeTab === "applications" ? "max-w-none" : "max-w-7xl"}`}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
