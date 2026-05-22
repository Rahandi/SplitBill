up:
	docker compose up --build
	docker compose down

docker-build:
	docker build -t splitbill-server ./server
	docker build -t splitbill-web ./web
