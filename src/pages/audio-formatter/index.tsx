import AudioProcessor from '../../components/AudioProcessor';
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
export default function AudioProcessorPage() {
  return <AudioProcessor />;
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "superAdmin"]);
