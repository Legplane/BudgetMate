import { createContext, useContext, useEffect, useState } from "react";

/* hash router: #/page/arg */
const read = () => {
  const [page = "", ...args] = location.hash.replace(/^#\/?/, "").split("/");
  return { page, args };
};
export const go = (path) => { location.hash = "/" + path; };
export function useRoute() {
  const [r, setR] = useState(read);
  useEffect(() => {
    const h = () => setR(read());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return r;
}

export const UserCtx = createContext(null);
export const useUser = () => useContext(UserCtx);
