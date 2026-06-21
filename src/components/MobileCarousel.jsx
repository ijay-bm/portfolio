import { useCallback, useEffect, useRef, useState } from "react";
import NextButton from "./NextButton";
import PreviousButton from "./PreviousButton";
import ShaderImageStage from "./ShaderImageStage";

// Project-change crossfade duration (keep in sync with the duration-[Xms] class).
const FADE_MS = 250;

function ProjectDetails({ project, hasImages }) {
  const [showHighlights, setShowHighlights] = useState(false);
  const descriptions = [project.summary, project.notes].filter(Boolean);
  const hasHighlights = project.highlights?.length > 0;
  const alignClass = hasImages ? "" : "items-center text-center";

  return (
    <div
      className={`flex flex-col overflow-y-auto p-6 ${
        hasImages ? "h-1/2 landscape:h-full landscape:w-1/2" : "flex-1"
      }`}
    >
      {/* my-auto centers the block when it fits, but collapses (no top clip) when
          it overflows, so the title stays reachable and the box scrolls. */}
      <div className={`my-auto flex flex-col gap-3 ${alignClass}`}>
        <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{project.title}</h2>
        {project.subtitle && (
          <p className="text-sm text-white/50 sm:text-base">{project.subtitle}</p>
        )}

        <div className="space-y-2 text-[19px] leading-relaxed text-white/80 sm:text-[22px]">
          {descriptions.map((description, i) => (
            <p key={i}>{description}</p>
          ))}
        </div>

        {(project.role || project.tech?.length > 0) && (
          <ul className={`flex flex-wrap gap-2 ${hasImages ? "" : "justify-center"}`}>
            {project.role && (
              <li className="rounded-full bg-purple-500/30 px-3 py-1 text-sm text-purple-100 backdrop-blur-sm sm:text-base">
                {project.role}
              </li>
            )}
            {project.tech?.map((tech, i) => (
              <li
                key={i}
                className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 backdrop-blur-sm sm:text-base"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}

        {hasHighlights && (
          <div className={`w-full ${hasImages ? "" : "max-w-xl"}`}>
            <button
              type="button"
              aria-expanded={showHighlights}
              onClick={() => setShowHighlights((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-white/15 px-4 py-2 text-[17px] text-white/80 transition hover:bg-white/10 active:scale-[0.99] sm:text-[19px]"
            >
              <span>Implementation highlights</span>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 transition-transform duration-200 ${
                  showHighlights ? "rotate-180" : ""
                }`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showHighlights && (
              <ul className="mt-3 space-y-3 text-left">
                {project.highlights.map((highlight, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[16px] leading-relaxed text-white/70 sm:text-[18px]"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
        <ProjectDetails key={projectIndex} project={project} hasImages={hasImages} />
      </div>

      <PreviousButton className="absolute bottom-4 left-4 z-10 !w-28" onClick={prevProject} />
      <NextButton className="absolute bottom-4 right-4 z-10 !w-28" onClick={nextProject} />
      <div className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 text-xs text-white/40">
        {projectIndex + 1} / {projects.length}
      </div>
    </div>
  );
}
