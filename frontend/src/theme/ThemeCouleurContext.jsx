import { createContext, useContext, useEffect, useState } from 'react';
import { ecrireThemeCouleurStocke, lireThemeCouleurStocke, themeValide } from '../lib/theme.js';

const ThemeCouleurContext = createContext(null);

// État partagé entre Navigation/App (attribut sur <html>, couleurs du fond animé) et le
// sélecteur dans /profil. Valeur initiale lue depuis localStorage en lazy init pour éviter un
// flash vert→couleur choisie au montage (un script inline dans index.html pose déjà l'attribut
// avant même le premier rendu React, voir index.html).
export function ThemeCouleurProvider({ children }) {
  const [theme, setThemeState] = useState(() => lireThemeCouleurStocke());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-couleur', theme);
  }, [theme]);

  function definirTheme(valeur) {
    const propre = themeValide(valeur);
    setThemeState(propre);
    ecrireThemeCouleurStocke(propre);
  }

  return (
    <ThemeCouleurContext.Provider value={{ theme, definirTheme }}>
      {children}
    </ThemeCouleurContext.Provider>
  );
}

export function useThemeCouleur() {
  const contexte = useContext(ThemeCouleurContext);
  if (!contexte) throw new Error('useThemeCouleur doit être utilisé sous ThemeCouleurProvider');
  return contexte;
}
