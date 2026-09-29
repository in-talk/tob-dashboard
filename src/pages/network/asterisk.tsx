import React, { useMemo } from "react";
import useSWR from "swr";
import { GetServerSideProps } from "next";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { IpServerManager } from "@/components/network/IpServerManager";
import { NetworkPage } from "@/components/network/shared";
import { KamailioAsteriskMap } from "@/lib/network/types";

export default function AsteriskPage() {
  const { data: maps } = useSWR<KamailioAsteriskMap[]>("/api/network/kamailio-asterisk", fetcher, {
    revalidateOnFocus: false,
  });
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
        dependents={["/api/network/kamailio-asterisk"]}
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
    </NetworkPage>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
