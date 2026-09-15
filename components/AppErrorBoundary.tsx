import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { withTranslation, type WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class AppErrorBoundaryBase extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ui] Unhandled render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const { t } = this.props;
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <section role="alert" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
            <AlertTriangle size={26} />
          </div>
          <h1 className="mt-5 text-xl font-bold text-ug-navy dark:text-white">{t('common.somethingWentWrong')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">{t('common.tryAgain')}</p>
          <button type="button" onClick={() => this.setState({ hasError: false })} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ug-teal px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-ug-teal focus:ring-offset-2">
            <RefreshCw size={15} /> {t('common.tryAgainButton')}
          </button>
        </section>
      </main>
    );
  }
}

export default withTranslation()(AppErrorBoundaryBase);
