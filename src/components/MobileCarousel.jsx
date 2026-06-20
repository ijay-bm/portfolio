import { useCallback, useEffect, useRef, useState } from "react";
import NextButton from "./NextButton";
import PreviousButton from "./PreviousButton";
import ShaderImageStage from "./ShaderImageStage";

// Project-change crossfade duration (keep in sync with the duration-[Xms] class).
const FADE_MS = 250;

function ProjectDetails({ project, hasImages }) {
  return (
    <div
      className={`flex flex-col justify-center gap-3 overflow-y-auto p-6 ${
        hasImages ? "h-1/2 landscape:h-full landscape:w-1/2" : "flex-1 items-center text-center"
      }`}
    >
      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{project.title}</h2>
      {project.subtitle && <p className="text-sm text-white/50 sm:text-base">{project.subtitle}</p>}

      <div className="space-y-2 text-[19px] leading-relaxed text-white/80 sm:text-[22px]">
        {project.descriptions?.map((description, i) => (
          <p key={i}>{description}</p>
        ))}
      </div>

      {project.roles?.length > 0 && (
        <ul className="space-y-1 text-[19px] text-white/80 sm:text-[22px]">
          {project.roles.map((role, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/60 sm:h-2 sm:w-2" />
              {role}
            </li>
          ))}
        </ul>
      )}

      {project.link && (
        <a
          href={project.link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block w-fit rounded bg-white/10 px-6 py-2 text-sm tracking-wide backdrop-blur-sm transition hover:bg-white/20 active:scale-95 sm:text-base"
        >
          OPEN
        </a>
      )}
    </div>
  );
}

export default function MobileCarousel({ projects }) {
  const [projectIndex, setProjectIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const fadingRef = useRef(false);
  const fadeTimer = useRef();
  const project = projects[projectIndex];
  const hasImages = project.imageUrls?.length > 0;

  // Fade the content out, swap project while invisible, then fade back in.
  const changeProject = useCallback(
    (dir) => {
      if (fadingRef.current) {
        return;
      }
      fadingRef.current = true;
      setFading(true);
      fadeTimer.current = setTimeout(() => {
        setProjectIndex((p) => (p + dir + projects.length) % projects.length);
        setFading(false);
        fadingRef.current = false;
      }, FADE_MS);
    },
    [projects.length]
  );

  const prevProject = useCallback(() => changeProject(-1), [changeProject]);
  const nextProject = useCallback(() => changeProject(1), [changeProject]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.repeat) {
        return;
      }
      if (event.key === "ArrowLeft") {
        prevProject();
      } else if (event.key === "ArrowRight") {
        nextProject();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevProject, nextProject]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#19191F] pt-14 text-white">
      <div
        className={`flex flex-1 flex-col overflow-hidden pb-16 transition-opacity duration-[250ms] ease-in-out landscape:flex-row ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {hasImages && (
          <div className="relative h-1/2 w-full landscape:h-full landscape:w-1/2">
            <ShaderImageStage images={project.imageUrls} />
          </div>
        )}
        <ProjectDetails project={project} hasImages={hasImages} />
      </div>

      <PreviousButton className="absolute bottom-4 left-4 z-10 !w-28" onClick={prevProject} />
      <NextButton className="absolute bottom-4 right-4 z-10 !w-28" onClick={nextProject} />
      <div className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 text-xs text-white/40">
        {projectIndex + 1} / {projects.length}
      </div>
    </div>
  );
}
