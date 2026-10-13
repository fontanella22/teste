# Sítio Três Irmãos

Protótipo navegável de gestão veterinária e controle de rebanho, em português, adaptado a celular e computador. Node.js 20 ou superior; com autenticação e banco Supabase.

```sh
cd /workspace/teste
npm ci
npm run build
npm start
```

Servidor na porta 3000 (configurável com `PORT`). Para validar: `npm test`.

## Telas e fluxos — gado de corte

- **Visão geral:** todos os animais cadastrados, inseminações no ano, bezerros e bezerras cadastrados, pendências sanitárias e partos previstos, localização dos animais.
- **Meu rebanho:** cadastro, busca, ficha individual, edição e localização. A categoria Matriz identifica as vacas de reprodução.
- **Saúde e sanidade:** calendário de vacinas e tabela de tratamentos com animal, tipo de cuidado, finalidade/condição, produto, responsável, aplicações e carência para abate. Opções: verminoses, controle de carrapatos, doença do carrapato, amarelão (nome popular), raiva, feridas e outra condição. São registros de suspeitas ou diagnósticos, sem protocolos ou prescrições automáticas.
- **Reprodução:** inseminação artificial, cobertura, diagnóstico de gestação, parto e perda gestacional. Ao registrar parto, o brinco opcional permite cadastrar o bezerro, ligado à matriz, com data de nascimento, sexo, raça e localização. Brincos repetidos são rejeitados. As previsões anteriores da mesma matriz são encerradas por parto/perda gestacional; apenas a previsão mais recente de cada matriz aparece como pendência.
- **Minha propriedade:** proprietário, contato, município, área, observações e exportação JSON.

O acesso exige conta Supabase autorizada. Os registros são compartilhados no banco protegido por RLS; não há dados fictícios novos. A cópia local da versão anterior fica preservada até importação explícita pelo administrador. A interface não apresenta o módulo leiteiro. Consulte [CONFIGURAR-SUPABASE.md](database/CONFIGURAR-SUPABASE.md) para ativar o projeto, criar a primeira conta e convidar a equipe.

## Banco de dados

`database/supabase.sql` é o esquema ativo planejado para PostgreSQL/Supabase com membros, documento versionado e RPCs. `database/schema.sql` permanece como modelo SQLite de tabelas normalizadas para uma futura evolução, separado do aplicativo atual. Relações: proprietário → propriedades → animais → vacinas, tratamentos e reprodução. Inclui parentesco da matriz e do bezerro, finalidade dos cuidados, chaves estrangeiras, brinco único por propriedade e índices. A tabela de leite permanece reservada para uso futuro. Alterações do esquema não são uma migração de uma base já existente.

## Regras e limites

Vacinas atrasadas ou nos próximos 7 dias e partos nos próximos 14 dias aparecem no painel. Inseminações não equivalem a gestações confirmadas. Bezerros e bezerras são contados pela categoria cadastrada. Lembretes internos, recalculados ao navegar/reabrir, sem push, SMS ou e-mail.

Carência para abate calculada em dias após a última aplicação, inclusive a data final; liberação no dia seguinte. Informar a bula e a prescrição veterinária; prazos em horas não são modelados. Os nomes populares não estabelecem diagnóstico e o aplicativo não recomenda medicamentos, doses ou vacinas.

Autenticação e armazenamento usam Supabase; políticas RLS bloqueiam visitantes e contas fora da equipe. Permissões: admin, editor e viewer. A primeira configuração do banco e das contas precisa ser feita no painel Supabase. Não há backup automático configurado, auditoria detalhada ou restauração automática; mantenha cópias privadas e configure backups. Testes de RLS executados em PostgreSQL local; validar também no projeto real antes de usar registros operacionais. A chave publicável é pública por projeto: não use secret/service_role no navegador. SDK oficial empacotado em public/supabase.js por npm run build, sem dependência de CDN em execução.

## Lotes, piquetes e acompanhamento

- Ícones de bovinos para marca, rebanho e bezerros.
- Rebanho ordenado do mais velho para o mais novo, com idade calculada e filtros por faixa etária, piquete, localização e lote.
- O cadastro mantém Pasto, Curral, Enfermaria e Maternidade. Piquete é um campo separado para animais no pasto; lote é um agrupamento informado pela equipe. Sugestões editáveis em Minha propriedade: Piquete do morro, Embaixo de casa, Pinheiros e Fundos (vizinho). Animais existentes não recebem piquete/lote automaticamente. Os piquetes ainda referenciados por animais continuam disponíveis para preservar o cadastro.
- Reprodução permite registrar o resultado de cada inseminação: aguardando, confirmada ou não confirmada, data da avaliação e observações. O painel conta os resultados das inseminações do ano. Ausência de resultado não é tratada como falha.
- Em Saúde e sanidade, programe vacina por lote com primeira data e intervalo em dias ou meses informado conforme orientação veterinária. Os animais presentes no lote na criação formam a lista da programação; alterações posteriores de lote não mudam essa lista. Para mudar a lista, pause e crie outro plano.
- “Vacina realizada” fica disponível a partir da data programada. A confirmação permite escolher animais, data efetiva e responsável. Desmarcados continuam pendentes; a próxima data só avança ao concluir o lote. É criado um histórico individual para cada aplicação confirmada.
- A recorrência mantém o calendário informado (por exemplo, dia 20 a cada 3 meses). Dias inexistentes usam o último dia do mês, recuperando o dia original no seguinte. Atrasos pulam datas já passadas sem inventar aplicações. Os lembretes continuam internos, sem envio de mensagens.

A atualização usa campos opcionais no documento JSON existente do Supabase e não exige executar uma nova migração SQL. As permissões de login e RLS continuam em vigor.

## Instalar como aplicativo (PWA)

- Android: abra o site no Chrome e toque em **Instalar aplicativo**, quando disponível, ou use **⋮ → Instalar aplicativo / Adicionar à tela inicial**.
- iPhone: abra no Safari e use **Compartilhar → Adicionar à Tela de Início**; ative **Abrir como app** se aparecer.
- No aplicativo instalado, o ícone abre uma janela própria. O menu **Instalação no celular** explica os passos. A disponibilidade do convite automático depende do navegador; navegação anônima pode bloquear instalação.
- Esta versão exige internet para autenticação e registros. Não mantém fila de alterações nem armazena respostas da API Supabase no cache offline. A interface pública pode abrir sem conexão depois da primeira visita; isso não autoriza acesso offline aos dados. Uma tela já aberta pode continuar mostrando dados carregados em memória, mas novas consultas/gravações exigem conexão.
- O service worker armazena apenas uma lista explícita de HTML, CSS, JavaScript e ícones públicos; ignora métodos não GET, chamadas externas, caminhos desconhecidos e URLs com parâmetros. Arquivos de verificação do Google não são alterados. Cópias locais antigas, descritas anteriormente, não são apagadas pela instalação.
- Quando aparecer **Nova versão · atualizar**, conclua ou cancele o formulário e toque no botão. A atualização espera autorização ou fechamento das janelas antigas; não recarrega automaticamente no meio de um cadastro.

**Antes de publicar qualquer mudança nos arquivos do aplicativo, execute `npm run build`.** O build gera `public/sw.js` com uma versão calculada a partir dos arquivos públicos e do template; assim a atualização do PWA reconhece código e imagens novos. Execute `npm test` após o build. Ícones PNG de 192/512 pixels, maskable e apple-touch-icon de 180 pixels acompanham o projeto; a fonte vetorial está em `public/app-icon.svg`.

Os caminhos relativos do manifesto e do worker suportam a publicação em `/teste/` (gh-pages) ou `/teste/public/` (main com redirecionamento). O escopo se limita à pasta publicada. Requer HTTPS em produção; localhost é usado apenas para validação. Não é uma publicação na Google Play/App Store.
