export default function NextButton({ className = "", onClick = () => {}, disabled }) {
  return (
    <button
      className={`group flex w-40 items-center gap-2 py-2 ${className} ${disabled && "pointer-events-none cursor-not-allowed"}`}
      onClick={() => {
        if (disabled) {
          return;
        }
        onClick();
      }}
      disabled={disabled}
    >
      <div className="h-[2px] flex-grow rounded-full bg-neutral-800 transition-all duration-[400ms] ease-in-out group-hover:w-3 group-hover:flex-grow-0 group-active:flex-grow group-active:duration-[300ms] dark:bg-neutral-600" />
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12 18a6 6 0 1 1 0-12a6 6 0 0 1 0 12m0-1.5a4.5 4.5 0 1 0 0-9a4.5 4.5 0 0 0 0 9"
        ></path>
      </svg>
      <div className="h-[2px] flex-grow rounded-full bg-neutral-800 transition-all duration-[360ms] ease-in-out group-hover:flex-grow group-active:w-1 group-active:flex-shrink group-active:flex-grow-0 group-active:duration-[280ms] dark:bg-neutral-600" />
      <svg
        className="ml-auto w-3 duration-150 group-hover:w-4 group-active:w-3"
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
      >
        <path fill="currentColor" d="M8 19V5l11 7z"></path>
      </svg>
    </button>
  );
}
