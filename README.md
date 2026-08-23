# Taskys

Organizador de tarefas gratuito e open-source, com lembretes que não deixam você esquecer.

- Tema liquid glass (preto e branco)
- Funciona no Linux (AppImage)
- Sem contas, sem plano pago, sem limite

## Recursos

- Tarefas com prioridade, prazo e subtarefas
- Projetos/lists para organizar
- Lembretes com popup em cima de tudo + som de alarme + soneca (5/15 min)
- Recorrência (diária, semanal, mensal) — ao concluir, a tarefa é reagendada para a próxima data
- Reordenação por arrastar e soltar
- Dashboard diário, estatísticas com gráficos e timer Pomodoro
- Atalhos: `Ctrl+N` (nova tarefa), `Ctrl+F` (buscar), `Ctrl+Shift+P` (foco)

## Instalar

```bash
curl -sSL https://taskys.squareweb.app/install.sh | bash
```

Ou baixe o AppImage direto em https://taskys.squareweb.app/download/appimage

## Servidor de download (site)

A pasta `site/` é servida por `server.py` (Python puro, sem dependências):

```bash
python3 server.py          # http://0.0.0.0:80
PORT=8000 python3 server.py
```

Rotas:

- `/` — site
- `/install.sh` — script de instalação
- `/download/appimage` — faz stream do AppImage local (`app/dist/`) ou redireciona para a release no GitHub
- `/api/downloads` — contador de downloads

## Estrutura

```
taskys/
├── app/          # Electron + React (código-fonte do app desktop)
├── site/         # Site estático de download
├── server.py     # Servidor do site (stdio http, sem deps)
├── install.sh    # Instalador one-liner
└── requirements.txt
```

## Licença

MIT — use à vontade.
