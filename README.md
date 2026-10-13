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
