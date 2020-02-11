# Minitwit Backend: The DevOps Drengene Flavor

Re-implemented in Nodejs, the dull choice for backend.



## Initialize Minitwit Backend REST-API

1. Make `control.sh` executeable:

2. ```shell
   chmod 755 control.sh
   ```

2. Install node dependencies:

   ```bash
   npm install
   ```

3. Initialize database

4. ```bash
   ./control.sh init
   ```

4. Compile the flag tool:

   ```bash
   make build
   ```

   



## Using Minitwit Backend (local)

**Start minitwit backend:**

```shell
./control.sh start
```

API endpoint: http://localhost:5001



**Stop minitwit backend:**

```shell
./control.sh stop
```



**Inspect database:**

```shell
./control.sh inspectdb
```



**Flag message:**

```bash
./control.sh flag [message-id]
```



## Run tests

[To be added]



