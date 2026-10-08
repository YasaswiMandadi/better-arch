import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCollaborator } from '../data/useCollaborators';
import { useSiteData } from '../data/store';

interface CollaboratorPopupContextValue {
  open: (slug: string) => void;
}

const CollaboratorPopupContext = createContext<CollaboratorPopupContextValue | null>(null);

/**
 * Per the client's handwritten spec, Collaborators are not a routed page —
 * they are a pop-up card, triggerable from Theme/Category, Sub-theme,
 * Episode and Essay pages alike. This provider renders that pop-up globally
 * so any page can open it by slug via useCollaboratorPopup().
 */
export function CollaboratorPopupProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  const { data } = useSiteData();
  const collaborator = useCollaborator(slug ?? undefined);
  const episodes = data.episodes;

  function close() {
    setSlug(null);
  }

  return (
    <CollaboratorPopupContext.Provider value={{ open: setSlug }}>
      {children}

      {slug && (
        <div
          className="fixed inset-0 bg-black/60 z-90 p-4 sm:p-8 overflow-auto flex items-start justify-center"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) close();
          }}
        >
          <div className="max-w-[640px] w-full bg-paper border border-hair rounded-[10px] shadow-2xl overflow-hidden mt-10">
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-hair">
              <h2 className="font-head font-bold text-[1.1rem]">Collaborator</h2>
              <button
                onClick={close}
                className="border border-hair rounded-full p-1.5 text-muted hover:text-deep hover:border-deep transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-auto">
              {!collaborator ? (
                <p className="text-muted">This collaborator could not be found.</p>
              ) : (
                <>
                  <div>
                    <h3 className="font-head font-extrabold text-[1.6rem] leading-[1.1] tracking-tight mb-1.5">
                      {collaborator.name}
                    </h3>
                    <p className="text-muted">
                      {collaborator.bio || 'No standing bio has been published for this collaborator yet.'}
                    </p>
                  </div>

                  {collaborator.episodeIds.length > 0 && (
                    <div>
                      <h4 className="font-head font-bold text-sm uppercase tracking-wide text-acd mb-2.5">
                        Episodes
                      </h4>
                      <ul className="space-y-2 list-none pl-0">
                        {collaborator.episodeIds.map((id) => {
                          const ep = episodes.find((e) => e.id === id);
                          if (!ep) return null;
                          return (
                            <li key={id} className="border-b border-hair pb-2">
                              <Link to={`/episode/${id}`} onClick={close} className="font-semibold hover:underline">
                                {ep.title}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {collaborator.essayIds.length > 0 && (
                    <div>
                      <h4 className="font-head font-bold text-sm uppercase tracking-wide text-acd mb-2.5">
                        Essays
                      </h4>
                      <ul className="space-y-2 list-none pl-0">
                        {collaborator.essayIds.map((id) => {
                          const es = data.essays.find((x) => x.id === id);
                          if (!es) return null;
                          return (
                            <li key={id} className="border-b border-hair pb-2">
                              <Link to={`/essay/${es.slug}`} onClick={close} className="font-semibold hover:underline">
                                {es.title}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </CollaboratorPopupContext.Provider>
  );
}

export function useCollaboratorPopup(): CollaboratorPopupContextValue {
  const ctx = useContext(CollaboratorPopupContext);
  if (!ctx) throw new Error('useCollaboratorPopup must be used within a CollaboratorPopupProvider');
  return ctx;
}
