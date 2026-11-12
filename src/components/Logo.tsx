import { useId } from "react";

const CUP = "M54 232 C53 224 57 222 64 225 C77 229 83 239 86 253 C99 318 140 358 202 370 C255 380 307 356 342 313 C366 284 377 252 379 226 C380 212 383 207 395 207 L417 207 C445 207 463 226 465 252 C466 277 454 298 435 311 C418 323 402 323 378 322 C359 348 336 369 309 383 C298 389 294 393 293 405 L293 410 C292 420 271 422 235 423 C202 423 172 421 170 414 C167 409 170 400 165 392 C162 386 153 382 143 376 C92 345 60 294 54 232 Z M407 237 C405 259 399 279 391 295 C407 297 420 288 428 277 C437 264 439 252 431 243 C425 236 416 236 407 237 Z";
const CAT = "M136 133 C141 129 147 130 151 135 C156 141 152 147 147 153 C131 173 123 194 123 216 C122 223 128 226 133 219 C139 200 147 187 158 179 C164 175 170 178 173 182 C179 190 172 196 167 202 C162 208 159 213 158 219 C156 224 160 225 166 221 C174 217 177 207 183 198 C188 189 195 180 201 179 C207 176 213 181 215 187 C217 194 207 200 203 207 C199 213 197 218 197 223 L231 223 C250 223 259 215 259 193 L259 143 C266 150 271 166 281 175 C295 188 321 188 337 175 C349 165 356 150 363 142 L363 222 C363 280 333 325 287 346 C249 363 210 357 177 341 C132 320 105 282 100 240 C94 201 109 160 136 133 Z";
const BUBBLE = "M421 86 C449 86 471 102 472 122 C473 145 449 161 421 160 C416 160 410 160 404 158 C398 165 391 169 382 171 C386 163 387 156 387 150 C376 143 370 134 370 123 C370 102 393 86 421 86 Z";

/** The NextCup mark: a cat curled in a coffee cup, with a speech bubble. */
export function LogoMark({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size * (479 / 525)} viewBox="0 0 525 479" role="img" aria-label="NextCup" className={animated ? "nc-anim" : undefined}>
      <defs>
        <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="252" x2="252" y1="128" y2="423">
          <stop offset="0%" stopColor="#bfa583" />
          <stop offset="28%" stopColor="#9d8c76" />
          <stop offset="63%" stopColor="#514737" />
          <stop offset="100%" stopColor="#352e20" />
        </linearGradient>
      </defs>
      <g className="nc-float">
        <path className="nc-cup" d={CUP} fill={`url(#g${id})`} fillRule="evenodd" />
        <g className="nc-cat">
          <path d={CAT} fill={`url(#g${id})`} />
          <g fill="#22241f">
            <ellipse cx="281.3" cy="202.6" rx="6.3" ry="3.3" />
            <ellipse cx="318.3" cy="202.6" rx="6.3" ry="3.3" />
          </g>
        </g>
        <g className="nc-bubble">
          <path d={BUBBLE} fill="#bda382" />
          <g fill="#252723">
            <circle cx="400.8" cy="123" r="5.5" /><circle cx="420.8" cy="123" r="5.5" /><circle cx="440.8" cy="123" r="5.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-[#fffaf6] border border-line shadow-soft"><LogoMark size={30} /></span>
      <span className="leading-none">
        <span className="block font-serif text-[22px] font-semibold tracking-[-0.01em] text-fg">NextCup</span>
      </span>
    </span>
  );
}
