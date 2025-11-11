import BulkAgeTestPage from "@/components/BulkAgeTester";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";

export default function AgeClassifier() {
  return <BulkAgeTestPage />;
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
