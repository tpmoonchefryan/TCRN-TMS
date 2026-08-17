import { RouteAccessGate } from '@/platform/routing/RouteAccessGate';

// TCRN-TMS-INC-002. This subtree had no layout at all, so its pages carried no
// session check and no capability check — they were reachable by typing the URL.
export default function GatedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RouteAccessGate>{children}</RouteAccessGate>;
}
