# Psicólogos Brasil

Site de terapia online em HTML, CSS e JavaScript puros (sem instalar nada).

## Como abrir
Dê dois cliques em `index.html`. Para testar como no servidor: `python3 -m http.server` na pasta e abra http://localhost:8000.

## Estrutura
```
CALMARIA/
├── index.html          Início
├── sobre.html          Sobre nós + responsável técnico + perguntas frequentes
├── psicologos.html     Lista de psicólogos com busca e filtros
├── servicos.html       Serviços e abordagens
├── agendamento.html    Formulário de agendamento (envia pelo WhatsApp)
├── contato.html        Contato, "Junte-se a nós" e empresas
├── artigos.html        Artigos (extra)
├── ansiedade.html      Página sobre ansiedade (extra)
├── css/
│   ├── global.css      Cores (:root), tipografia, botões, formulários
│   ├── header.css      Topo, menu do celular e barra de baixo
│   ├── footer.css      Rodapé
│   ├── home.css  sobre.css  psicologos.css  servicos.css
│   └── agendamento.css  contato.css  artigos.css  ansiedade.css
├── js/
│   ├── main.js         Dados (PROS, WHATSAPP) e utilidades, usado em todas as páginas
│   ├── menu.js         Menu do celular
│   ├── psicologos.js   Busca, filtros e horários
│   ├── agendamento.js  Formulário de agendamento
│   └── artigos.js      Textos dos artigos
└── assets/
    ├── imagens/        Fotos (00.webp, 01.webp, responsavel.webp, ansiedade.webp)
    ├── icones/         favicon.svg
    └── fontes/         (vazia: as fontes vêm do Google Fonts)
```

## Onde mudar cada coisa
- **Logo:** substitua `assets/imagens/logo.svg` pela sua logo (PNG, WebP ou SVG). Se mudar a extensão, ajuste o `src` do `<img class="logo-img">` no topo de cada página. A altura da logo é `.logo-img` em `css/header.css`.
- **Cores:** `css/global.css`, no topo, em `:root` (`--sea` verde, `--sun` amarelo, `--bg` fundo).
- **Largura do site:** `.wrap` em `css/global.css`.
- **Psicólogos:** `PROS` em `js/main.js`.
- **WhatsApp:** `WHATS` em `js/main.js` e os links `api.whatsapp.com` nos HTML.
- **Artigos:** `ARTIGOS` em `js/artigos.js` (o modelo está no comentário).
- **Imagens:** coloque os arquivos em `assets/imagens/` com os mesmos nomes.
- **Menu e rodapé:** são repetidos em cada `.html`. Ao mudar um link, altere em todas as páginas.

## Para criar uma página nova
1. Copie uma página parecida (ex.: `servicos.html`) e troque o conteúdo de `<main>`.
2. Crie `css/nova.css` e liste na `<head>` depois de global, header e footer.
3. Inclua o link no menu e no rodapé de todas as páginas.

## Pendências
- Links "Ler mais" e "Assistir no Reels" da página de Ansiedade ainda estão com `#`.
- "Termos de uso" e "Política de privacidade" ainda apontam para o início.
- Profissionais, horários e depoimentos são fictícios.

## Cores, menu lateral e botão flutuante
- **Cores:** estão no topo de `css/global.css`, em `:root`. O azul principal é `--sea: #1f35b5`. Troque ali e o site inteiro muda.
- **Menu do celular:** abre pela direita (`.drawer` em `css/header.css`). Os links são os de `<aside class="drawer">`, repetido no topo de cada página.
- **Botão flutuante:** fica no fim do HTML de cada página (`<div class="fab-bar">`). A lógica de sumir e aparecer está em `js/menu.js`. Ele só aparece no celular e não aparece em `agendamento.html`.
- **Cabeçalho:** fixo só no computador. No celular ele rola junto com a página.
