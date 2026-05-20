import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

/**
 * Este componente define o template HTML base para a renderização Web do Expo Router.
 * Ele é executado apenas no lado do servidor (SSR) durante o build ou dev da web.
 */
export default function HTML({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Vincular manifesto do PWA para ícones e instalação */}
        <link rel="manifest" href="/manifest.json" />

        {/* Configurações extras de compatibilidade iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Prisma" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* Reseta estilos de scroll em plataformas Web */}
        <ScrollViewStyleReset />

        {/* Estilos base globais para o corpo do HTML na Web */}
        <style dangerouslySetInnerHTML={{ __html: htmlStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const htmlStyles = `
body {
  background-color: #0a0a0c;
  overflow: hidden;
}
`;
