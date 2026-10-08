import type { ReactNode } from 'react';
import Topbar from './Topbar';
import SideNav, { type SideItem } from './SideNav';

export default function InnerLayout({
  children, sideItems,
}: {
  children: ReactNode;
  sideItems: SideItem[];
}) {
  return (
    <div className="pt-[54px]">
      <Topbar />
      <SideNav items={sideItems} />
      <main className="lg:pl-[268px]">
        <div className="max-w-[880px] mx-auto px-6 pt-10 pb-28">{children}</div>
      </main>
    </div>
  );
}
