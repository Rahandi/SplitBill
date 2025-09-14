up:
	docker compose up --build
	docker compose down

docker-build:
	docker build -t splitbill-discord ./discord
	docker build -t splitbill-server ./server