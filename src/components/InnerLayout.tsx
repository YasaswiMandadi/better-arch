import type { ReactNode } from 'react';
import Topbar from './Topbar';
import SideNav, { type SideItem } from './SideNav';

export default function InnerLayout({
  children, sideItems, sideKicker, sideFoot,
}: {
  children: ReactNode;
  sideItems: SideItem[];
  sideKicker: string;
  sideFoot: { label: string; to: string }[];
}) {
  return (
    <div className="pt-[54px]">
      <Topbar />
      <SideNav items={sideItems} kicker={sideKicker} footLinks={sideFoot} />
      <main className="lg:pl-[268px]">
        <div className="max-w-[880px] mx-auto px-6 pt-10 pb-28">{children}</div>
      </main>
    </div>
  );
}
