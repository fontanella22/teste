# Sítio Três Irmãos

Protótipo navegável de gestão veterinária e controle de rebanho, em português, adaptado a celular e computador. Node.js 20 ou superior; sem dependências de instalação.

```sh
cd /workspace/teste
npm start
```

Servidor na porta 3000 (configurável com `PORT`). Para validar: `npm test`.

## Telas e fluxos — gado de corte

- **Visão geral:** todos os animais cadastrados, inseminações no ano, bezerros e bezerras cadastrados, pendências sanitárias e partos previstos, localização dos animais.
- **Meu rebanho:** cadastro, busca, ficha individual, edição e localização. A categoria Matriz identifica as vacas de reprodução.
- **Saúde e sanidade:** calendário de vacinas e tabela de tratamentos com animal, tipo de cuidado, finalidade/condição, produto, responsável, aplicações e carência para abate. Opções: verminoses, controle de carrapatos, doença do carrapato, amarelão (nome popular), raiva, feridas e outra condição. São registros de suspeitas ou diagnósticos, sem protocolos ou prescrições automáticas.
- **Reprodução:** inseminação artificial, cobertura, diagnóstico de gestação, parto e perda gestacional. Ao registrar parto, o brinco opcional permite cadastrar o bezerro, ligado à matriz, com data de nascimento, sexo, raça e localização. Brincos repetidos são rejeitados. As previsões anteriores da mesma matriz são encerradas por parto/perda gestacional; apenas a previsão mais recente de cada matriz aparece como pendência.
- **Minha propriedade:** proprietário, contato, município, área, observações e exportação JSON.

Dados fictícios na primeira abertura; salvos em localStorage por navegador/origem. Atualizações mantêm o armazenamento anterior, inclusive históricos de leite e categorias antigas, sem excluir registros. A interface atual não apresenta o módulo leiteiro. Importação/restauração ainda não implementada.

## Banco de dados

`database/schema.sql` é um esquema SQLite para futura API, separado do protótipo. Relações: proprietário → propriedades → animais → vacinas, tratamentos e reprodução. Inclui parentesco da matriz e do bezerro, finalidade dos cuidados, chaves estrangeiras, brinco único por propriedade e índices. A tabela de leite permanece reservada para uso futuro. Alterações do esquema não são uma migração de uma base já existente.

## Regras e limites

Vacinas atrasadas ou nos próximos 7 dias e partos nos próximos 14 dias aparecem no painel. Inseminações não equivalem a gestações confirmadas. Bezerros e bezerras são contados pela categoria cadastrada. Lembretes internos, recalculados ao navegar/reabrir, sem push, SMS ou e-mail.

Carência para abate calculada em dias após a última aplicação, inclusive a data final; liberação no dia seguinte. Informar a bula e a prescrição veterinária; prazos em horas não são modelados. Os nomes populares não estabelecem diagnóstico e o aplicativo não recomenda medicamentos, doses ou vacinas.

Sem backend, autenticação, sincronização ou backup automático. Não utilizar como único registro operacional. Antes de produção, implementar API com validação no servidor, autenticação, backup, auditoria, restauração e política de dados.
