# Psicólogos, Artigos, Usuários e Configurações — onde mexer

Cada área tem a sua página, igual a Agenda, Pacientes e Financeiro:

| Área | Página (o que aparece na tela) |
|---|---|
| Psicólogos | `painel/psicologos.html` |
| Artigos | `painel/artigos.html` |
| Usuários | `painel/usuarios.html` |
| Configurações | `painel/config.html` |

As quatro usam o mesmo visual (`painel/css/conteudo.css`) e os mesmos arquivos de funcionamento desta pasta,
porque dividem muita coisa (dados, publicar no site, imagens, modelo da página):

| Quero mudar… | Arquivo |
|---|---|
| Funções gerais, imagens, HTML/CSS das páginas que vão para o site | `base.js` |
| Editor de artigos, schema, YouTube, nota de SEO | `artigos-editor.js` |
| Formulário do perfil do psicólogo e prévia | `psicologos-editor.js` |
| Configurações e cliques dos editores | `eventos.js` |
| Publicar / excluir / desativar no site, rascunhos, login | `publicar.js` |
| Listas de Psicólogos e Artigos, filtros, quadros, ficha | `listas.js` |
| Acesso do psicólogo à agenda (senha padrão, desativar) | `acessos-psicologo.js` |
| Permissões e menu | `permissoes.js` |
| Usuários, equipe, Atividades | `usuarios.js` |
| Nota de perfil completo, temas em destaque | `perfil-extras.js` |
| O que roda ao abrir a página | `inicio.js` |
| Botão "Mais" no celular | `barra-celular.js` |
| E-mail automático (SMTP) — só em Configurações | `painel/js/smtp.js` |

Regras:
- Os arquivos rodam **na ordem** em que aparecem no fim de cada página e dividem as mesmas variáveis. Não mude a ordem.
- Cada página diz quem ela é em `<body data-pagina="psicologos">` (ou artigos, usuarios, config).
- Ao mexer num arquivo, aumente o `?v=` dele **nas quatro páginas** para o navegador não usar a cópia antiga.
- Abrir a ficha de alguém direto: `psicologos.html#a:ID-DA-AGENDA`.
- `conteudo.html` ficou só para os endereços antigos: ele manda para a página certa.
