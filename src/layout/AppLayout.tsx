import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Languages,
  Stethoscope,
  Package,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  Settings,
  Menu,
  FileText,
  Activity,
  Hammer,
  Sparkles,
  Upload,
  Lock,
  Unlock,
  X,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppContext } from '@/src/context/AppContext';
import { usePersistedState } from '@/src/hooks/usePersistedState';
import { MemberSwitcher } from '@/src/components/MemberSwitcher';

const sceneItems = [
  { path: '/agent', label: '看懂新报告', subtitle: '上传/拍照后由 Agent 陪看', icon: Sparkles, color: 'text-amber-700' },
  { path: '/interpret', label: '报告复盘', subtitle: '对已归档报告做趋势深挖', icon: FileText, color: 'text-neutral-700' },
  { path: '/prepare', label: '准备去复诊', subtitle: '提取数据并自述面诊', icon: Stethoscope, color: 'text-neutral-700' },
  { path: '/status', label: '查看近况', subtitle: '四载仪表特征透析', icon: Activity, color: 'text-emerald-700' },
];

const toolItems = [
  { path: '/members', label: '家庭成员管理', icon: UserPlus },
  { path: '/dashboard', label: '健康仪表盘', icon: BarChart3 },
  { path: '/translation', label: '指标翻译层', icon: Languages },
  { path: '/clinical', label: '就诊参考卡', icon: Stethoscope },
  { path: '/protocol', label: '协议干预层', icon: Users },
  { path: '/archive', label: '数据资产中心', icon: Package },
  { path: '/knowledge', label: '知识库版本', icon: FileText },
];

const HEADER_TITLES: Record<string, string> = {
  '/interpret': '报告复盘',
  '/prepare': '准备去复诊',
  '/status': '查看近况 (健康仪表盘)',
  '/dashboard': '健康仪表盘 (高级入口)',
  '/translation': '指标翻译层 (高级入口)',
  '/clinical': '就诊参考卡 (高级入口)',
  '/protocol': '协议干预层 (高级入口)',
  '/archive': '数据资产中心 (高级入口)',
  '/onboarding': '首批档案初始化导入',
  '/members': '家庭成员管理',
  '/knowledge': '知识库版本',
};

export function AppLayout() {
  const { hasData, setHasData, activateDemoArchive, activeMemberId } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('health-link:sidebarCollapsed', false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  const isDev = import.meta.env.DEV;

  const isCompact = sidebarCollapsed && isDesktop;

  useEffect(() => {
    if (!hasData && location.pathname !== '/onboarding' && location.pathname !== '/members') {
      navigate('/onboarding', { replace: true });
    }
  }, [hasData, location.pathname, navigate]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!hasData && location.pathname !== '/onboarding' && location.pathname !== '/members') {
    return <Navigate to="/onboarding" replace />;
  }

  if (hasData && location.pathname === '/onboarding') {
    return <Navigate to="/status" replace />;
  }

  const headerTitle = HEADER_TITLES[location.pathname] ?? '个人档案管理';

  const goTo = (path: string) => {
    navigate(path);
    setMobileSidebarOpen(false);
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-white">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="关闭导航"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-[#FDFCFB] border-r border-[#1A1A1A] flex flex-col h-screen overflow-y-auto shrink-0 transition-all duration-300 ease-in-out',
          isCompact ? 'w-[56px]' : 'w-[248px]',
          'max-lg:w-[248px]',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:relative lg:translate-x-0',
        )}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center border-b border-[#1A1A1A]/5 shrink-0 h-12">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              title={isCompact ? '展开导航' : '收起导航'}
              aria-label={isCompact ? '展开导航' : '收起导航'}
              className={cn(
                'hidden lg:flex items-center hover:bg-black/[0.03] transition-colors text-left h-full min-w-0',
                isCompact ? 'w-full justify-center px-1.5' : 'flex-1 gap-0 px-5',
              )}
            >
              {isCompact ? (
                <Package className="w-5 h-5 text-neutral-800 shrink-0" />
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-4 h-4 text-neutral-800 shrink-0" />
                  <h1 className="font-serif italic text-xl tracking-tight leading-none text-[#1A1A1A] truncate">
                    Health Link
                  </h1>
                </div>
              )}
            </button>

            {!isCompact && (
              <>
                <div className="lg:hidden flex-1 min-w-0 px-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-neutral-800 shrink-0" />
                  <h1 className="font-serif italic text-xl tracking-tight leading-none text-[#1A1A1A] truncate">
                    Health Link
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 mr-3 hover:bg-black/5 border border-black/10 lg:hidden shrink-0"
                  aria-label="关闭导航"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className={cn('flex-1 overflow-y-auto', isCompact ? 'py-2 px-1.5 space-y-1' : 'p-4 space-y-6')}>
            <div className="space-y-2">
              {!hasData ? (
                <button
                  type="button"
                  onClick={() => goTo('/onboarding')}
                  title="导入你的第一份体检报告"
                  className={cn(
                    'w-full flex items-center bg-amber-50/40 border border-amber-300/80 text-amber-950 shadow-sm rounded-sm text-left transition-all',
                    isCompact ? 'justify-center p-2.5' : 'items-start gap-3 px-3.5 py-3.5',
                  )}
                >
                  <Upload className={cn('text-amber-800 shrink-0', isCompact ? 'w-5 h-5' : 'w-5 h-5 mt-0.5 animate-pulse')} />
                  {!isCompact && (
                    <div>
                      <p className="text-xs font-bold tracking-tight uppercase">导入你的第一份体检报告</p>
                      <p className="text-[9px] text-amber-800/80 font-serif mt-0.5">尚未初始化，请先导入 PDF 或激活 Demo。</p>
                    </div>
                  )}
                </button>
              ) : (
                <nav className={cn(isCompact ? 'space-y-1' : 'space-y-1')}>
                  {sceneItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        title={item.label}
                        onClick={() => goTo(item.path)}
                        className={cn(
                          'w-full flex items-center transition-all rounded-sm border text-left',
                          isCompact ? 'justify-center p-2.5' : 'items-start gap-3 px-3.5 py-2.5',
                          isActive
                            ? 'bg-[#1A1A1A]/5 border-[#1A1A1A] text-[#1A1A1A]'
                            : 'bg-white/40 border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#F2F1EF]/30',
                        )}
                      >
                        <item.icon className={cn('shrink-0', isCompact ? 'w-5 h-5' : 'w-4 h-4 mt-0.5', item.color)} />
                        {!isCompact && (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold tracking-tight uppercase leading-tight">{item.label}</p>
                              <p className="text-[9px] opacity-60 font-serif mt-0.5 truncate">{item.subtitle}</p>
                            </div>
                            {isActive && <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />}
                          </>
                        )}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>

            {hasData && (
              <div className={cn('border-t border-neutral-200/65 space-y-1.5', isCompact ? 'pt-3' : 'pt-4')}>
                {isCompact ? (
                  <>
                    <div className="mx-auto w-6 border-t border-neutral-200/80 mb-2" aria-hidden />
                    {toolItems.map((tool) => {
                      const isActive = location.pathname === tool.path;
                      return (
                        <button
                          key={tool.path}
                          type="button"
                          title={tool.label}
                          onClick={() => goTo(tool.path)}
                          className={cn(
                            'w-full flex items-center justify-center p-2.5 rounded-sm border transition-all',
                            isActive
                              ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                              : 'text-[#1A1A1A]/60 border-transparent hover:bg-neutral-100/55',
                          )}
                        >
                          <tool.icon className="w-4 h-4 shrink-0" />
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                      className="w-full flex items-center justify-between px-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/40 hover:text-[#1A1A1A] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Hammer className="w-3 h-3" />
                        底层功能库列表
                      </span>
                      {isToolsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {isToolsExpanded && (
                      <div className="space-y-0.5 pl-0.5 pt-1">
                        {toolItems.map((tool) => {
                          const isActive = location.pathname === tool.path;
                          return (
                            <button
                              key={tool.path}
                              type="button"
                              onClick={() => goTo(tool.path)}
                              className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-sm border text-left text-[10px] uppercase tracking-wider font-bold',
                                isActive
                                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                                  : 'text-[#1A1A1A]/60 border-transparent hover:bg-neutral-100/55',
                              )}
                            >
                              {tool.label}
                              {isActive && <ChevronRight className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={cn('border-t border-[#1A1A1A]/5 shrink-0', isCompact ? 'p-2' : 'p-4 space-y-2.5')}>
          {isDev && !isCompact && (
            <div className="p-3 bg-neutral-100 border border-neutral-200 flex flex-col gap-1.5">
              <span className="text-[8px] font-mono uppercase font-bold text-neutral-400">开发者沙盒</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasData(false);
                    goTo('/onboarding');
                  }}
                  className={cn(
                    'flex-1 text-[9px] py-1 rounded-sm border font-bold',
                    !hasData ? 'bg-[#1A1A1A] text-white' : 'bg-white border-neutral-300',
                  )}
                >
                  新用户
                </button>
                <button
                  type="button"
                  onClick={() => {
                    activateDemoArchive();
                    goTo('/status');
                  }}
                  className={cn(
                    'flex-1 text-[9px] py-1 rounded-sm border font-bold',
                    hasData ? 'bg-[#1A1A1A] text-white' : 'bg-white border-neutral-300',
                  )}
                >
                  Demo 档案
                </button>
              </div>
            </div>
          )}

          <MemberSwitcher compact={isCompact} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-12 border-b border-[#1A1A1A] bg-[#FDFCFB]/90 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 hover:bg-black/5 border border-black/10 shrink-0 lg:hidden"
              aria-label="打开导航"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex gap-2 text-[9px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/40 min-w-0 truncate">
              <span className="hidden sm:inline shrink-0">个人健康档案</span>
              <span className="hidden sm:inline opacity-25 shrink-0">/</span>
              <span className="text-[#1A1A1A] truncate">{headerTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex gap-5 text-[8px] font-mono font-bold uppercase opacity-30 tracking-widest">
              <span>PDF: 本地解析</span>
              <span>AI: 服务端</span>
              <span className="flex items-center gap-1">
                {hasData ? (
                  <>
                    <Unlock className="w-2.5 h-2.5 text-emerald-700" />
                    <span className="text-emerald-700">已激活</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-2.5 h-2.5 text-amber-700" />
                    <span className="text-amber-700">未加载</span>
                  </>
                )}
              </span>
            </div>
            <button type="button" className="hover:opacity-50 p-1" aria-label="通知">
              <Bell className="w-4 h-4" />
            </button>
            <button type="button" className="hover:opacity-50 p-1" aria-label="设置">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-6 lg:py-6">
          <div className={cn('mx-auto w-full', sidebarCollapsed ? 'max-w-6xl' : 'max-w-5xl')}>
            <Outlet key={activeMemberId} />
          </div>
        </div>
      </main>
    </div>
  );
}
