import { useSiteData } from '../../data/store';

/** Topbar indicator for the shared-database state; renders nothing when the
 * site runs on browser-only storage. */
export default function SyncBadge() {
  const { remote, logout } = useSiteData();
  if (!remote.enabled) return null;
  const map = {
    synced: ['bg-moss', 'Saved to database'],
    saving: ['bg-amber', 'Saving to database…'],
    error: ['bg-rust', remote.available ? 'Database save failed' : 'Database unreachable'],
    readonly: ['bg-faint', 'Not signed in'],
    loading: ['bg-amber', 'Connecting…'],
    off: ['bg-faint', ''],
  } as const;
  const [dot, label] = map[remote.status];
  return (
    <>
      <span className="hidden sm:inline-flex items-center gap-2 font-mono text-[11px] text-paper/50" title={remote.message || undefined}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </span>
      {remote.admin && (
        <button onClick={logout} className="text-[12px] font-sans font-semibold text-paper/80 border border-paper/25 rounded-full px-3 py-1.5 hover:border-rust hover:text-white transition-colors">
          Sign out
        </button>
      )}
    </>
  );
}
