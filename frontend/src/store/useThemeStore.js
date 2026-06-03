import { create } from 'zustand'

export const useThemeStore = create((set) =>({
    theme: localStorage.getItem("hiii-theme") || "forest",
    setTheme:(theme) => {
        localStorage.setItem("hiii-theme",theme);
        set({theme});
    },
}))
