import chalkboardA from "./assets/images/chalkboard-a.webp";
import chalkboardB from "./assets/images/chalkboard-b.webp";
import chalkboardC from "./assets/images/chalkboard-c.webp";
import chalkboardD from "./assets/images/chalkboard-d.webp";
import chalkboardE from "./assets/images/chalkboard-e.webp";
import chalkboardF from "./assets/images/chalkboard-f.webp";

import chalkboardManagerA from "./assets/images/chalkboard-manager-a.webp";
import chalkboardManagerB from "./assets/images/chalkboard-manager-b.webp";
import chalkboardManagerC from "./assets/images/chalkboard-manager-c.webp";
import chalkboardManagerD from "./assets/images/chalkboard-manager-d.webp";

import chalkboardAralAmsA from "./assets/images/chalkboard-aral-ams-a.webp";
import chalkboardAralAmsB from "./assets/images/chalkboard-aral-ams-b.webp";
import chalkboardAralAmsC from "./assets/images/chalkboard-aral-ams-c.webp";
import chalkboardAralAmsD from "./assets/images/chalkboard-aral-ams-d.webp";
import chalkboardAralAmsE from "./assets/images/chalkboard-aral-ams-e.webp";
import chalkboardAralAmsF from "./assets/images/chalkboard-aral-ams-f.webp";

import chalkboardAralA from "./assets/images/chalkboard-aral-a.webp";
import chalkboardAralB from "./assets/images/chalkboard-aral-b.webp";
import chalkboardAralC from "./assets/images/chalkboard-aral-c.webp";
import chalkboardAralD from "./assets/images/chalkboard-aral-d.webp";
import chalkboardAralE from "./assets/images/chalkboard-aral-e.webp";

import spacefarersA from "./assets/images/spacefarers-a.webp";
import spacefarersB from "./assets/images/spacefarers-b.webp";
import spacefarersC from "./assets/images/spacefarers-c.webp";
import spacefarersD from "./assets/images/spacefarers-d.webp";
import spacefarersE from "./assets/images/spacefarers-e.webp";

import UnifiedProjectCarousel from "./components/UnifiedProjectCarousel";

import personalPageA from "./assets/images/personal-page-a.webp";
import personalPageB from "./assets/images/personal-page-b.webp";

const projects = [
  {
    title: "Chalkboard",
    subtitle: "Q4 2021 — Q3 2024",
    descriptions: [
      "An online tutoring platform where learners and tutors can meet. A marketplace where tutors personalize your learning experience."
    ],
    roles: ["Full Stack Developer", "Deployments", "Features Development", "Co-contributor"],
    imageUrls: [chalkboardA, chalkboardB, chalkboardC, chalkboardD, chalkboardE, chalkboardF],
    link: "https://chalkboard.com.ph/"
  },
  {
    title: "Chalkboard Manager",
    subtitle: "Q4 2021 — Q3 2024",
    descriptions: [
      "A back-office web app that manages the customer-facing Chalkboard tutoring marketplace"
    ],
    roles: [
      "Full Stack Developer",
      "Deployments",
      "Sole Contributor",
      "AWS Infrastructure Maintainer"
    ],
    imageUrls: [chalkboardManagerA, chalkboardManagerB, chalkboardManagerC, chalkboardManagerD]
  },
  {
    title: "Chalkboard Aral AMS",
    subtitle: "Q2 2024 — Q3 2024",
    descriptions: [
      "A QR code-based Attendance Monitoring System (AMS) for real-time token-based attendance tracking.",
      "Utilizes handshakes between an overseer and a tutor to monitor attendance."
    ],
    roles: ["Sole Contributor", "Full Stack Developer", "AWS Infrastructure Maintainer"],
    imageUrls: [
      chalkboardAralAmsA,
      chalkboardAralAmsB,
      chalkboardAralAmsC,
      chalkboardAralAmsD,
      chalkboardAralAmsE,
      chalkboardAralAmsF
    ]
  },
  {
    title: "Chalkboard Aral",
    subtitle: "Q3 2024",
    descriptions: ["A landing page and information hub for all of Chalkboard's ARAL initiatives."],
    roles: ["Minor Contributor", "AWS Infrastructure Maintainer"],
    imageUrls: [
      chalkboardAralA,
      chalkboardAralB,
      chalkboardAralC,
      chalkboardAralD,
      chalkboardAralE
    ],
    link: "https://aral.chalkboard.com.ph/"
  },
  {
    title: "Spacefarers",
    subtitle: "Q3 2022",
    descriptions: ["A SAMPLE landing page for an imaginary org called Spacefarers."],
    roles: ["Sole Contributor"],
    imageUrls: [spacefarersA, spacefarersB, spacefarersC, spacefarersD, spacefarersE],
    link: "https://ijay-bm.github.io/landing-page/"
  },
  {
    title: "_ _ _ _ _ _",
    subtitle: "Q2 2021",
    descriptions: ["A SAMPLE personal page for the imaginary person ______."],
    roles: ["Sole Contributor"],
    imageUrls: [personalPageA, personalPageB],
    link: "https://ijay-bm.github.io/personal-page-01/"
  },
  {
    title: "Resume",
    type: "resume",
    descriptions: ["Like what you've seen? Check out my resume!"],
    link: "https://ijay-bm.github.io/resume/"
  }
];

export default function App() {
  return (
    <div className="relative h-full w-full">
      <h3 className="absolute left-1/2 top-5 z-10 -translate-x-1/2 tracking-widest">IJAY M.</h3>
      <UnifiedProjectCarousel
        projects={projects}
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </div>
  );
}
