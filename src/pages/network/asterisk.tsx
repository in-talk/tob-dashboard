import React, { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import useSWR from "swr";
import { GetServerSideProps } from "next";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button } from "@/components/ui/button";
import { AudioSyncDialog } from "@/components/network/AudioSyncDialog";
import { IpServerManager } from "@/components/network/IpServerManager";
import { NetworkPage } from "@/components/network/shared";
import { AsteriskMachine, KamailioAsteriskMap } from "@/lib/network/types";

export default function AsteriskPage() {
  const { data: maps } = useSWR<KamailioAsteriskMap[]>("/api/network/kamailio-asterisk", fetcher, {
    revalidateOnFocus: false,
  });
  // Same key as IpServerManager's list, so SWR shares the request.
  const { data: machines } = useSWR<AsteriskMachine[]>("/api/network/asterisk", fetcher, {
    revalidateOnFocus: false,
  });
  const [syncOpen, setSyncOpen] = useState(false);
  const counts = useMemo(() => {
    const out = new Map<string, number>();
    maps?.forEach((m) => out.set(m.asterisk_id, (out.get(m.asterisk_id) ?? 0) + 1));
    return out;
  }, [maps]);

  return (
    <NetworkPage
      title="Asterisk machines"
      description="Media servers that Kamailio routes calls to."
    >
      <IpServerManager
        endpoint="/api/network/asterisk"
        noun="Asterisk machine"
        withPrivateIp
        withName
        dependents={["/api/network/kamailio-asterisk"]}
        extraActions={
          <Button variant="outline" onClick={() => setSyncOpen(true)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Sync audios
          </Button>
        }
        deleteWarning="Any Kamailio mappings to this machine will also be removed. This cannot be undone."
        extraColumns={[
          {
            key: "mappings",
            header: "Kamailio servers",
            sortValue: (r) => counts.get(r.id) ?? 0,
            render: (r) => (
              <span className="text-xs text-muted-foreground">{counts.get(r.id) ?? 0}</span>
            ),
          },
        ]}
      />
      <AudioSyncDialog open={syncOpen} onOpenChange={setSyncOpen} machines={machines ?? []} />
    </NetworkPage>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
