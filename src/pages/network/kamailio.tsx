import React, { useMemo } from "react";
import useSWR from "swr";
import { GetServerSideProps } from "next";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { IpServerManager } from "@/components/network/IpServerManager";
import { NetworkPage } from "@/components/network/shared";
import { KamailioAsteriskMap, KamailioClientIpMap } from "@/lib/network/types";

function countBy<T>(rows: T[] | undefined, key: (r: T) => string) {
  const out = new Map<string, number>();
  rows?.forEach((r) => out.set(key(r), (out.get(key(r)) ?? 0) + 1));
  return out;
}

export default function KamailioPage() {
  const { data: clientMaps } = useSWR<KamailioClientIpMap[]>(
    "/api/network/kamailio-client-ips",
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: asteriskMaps } = useSWR<KamailioAsteriskMap[]>(
    "/api/network/kamailio-asterisk",
    fetcher,
    { revalidateOnFocus: false }
  );
  const clientCounts = useMemo(() => countBy(clientMaps, (m) => m.kamailio_id), [clientMaps]);
  const asteriskCounts = useMemo(() => countBy(asteriskMaps, (m) => m.kamailio_id), [asteriskMaps]);

  return (
    <NetworkPage
      title="Kamailio servers"
      description="SIP proxies that receive client traffic and route it to Asterisk."
    >
      <IpServerManager
        endpoint="/api/network/kamailio"
        noun="Kamailio server"
        dependents={["/api/network/kamailio-client-ips", "/api/network/kamailio-asterisk"]}
        deleteWarning="All client-IP and Asterisk mappings for this server will also be removed. This cannot be undone."
        extraColumns={[
          {
            key: "mappings",
            header: "Mapped",
            sortValue: (r) => (clientCounts.get(r.id) ?? 0) + (asteriskCounts.get(r.id) ?? 0),
            render: (r) => (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {clientCounts.get(r.id) ?? 0} client IPs · {asteriskCounts.get(r.id) ?? 0} Asterisk
              </span>
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
