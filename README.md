# Minitwit Backend: The DevOps Drengene Flavor

Re-implemented in Node.js, the dull choice for backend.

## Using Minitwit Backend (local)

**Compile flag_tool.c:**
```bash
$ gcc ./flag_tool.c -o flag_tool -lsqlite3
```

**Init the Database:**
```bash
$ ./control.sh init
```

**Start the Database:**
```bash
$ ./control.sh start
```

**Inspect database:**

```shell
$ ./control.sh inspectdb
```

**Flag message:**

```bash
$ ./control.sh flag [message-id]
```



## Setup and run simulator tests

1. Build and run the full Docker setup as described in the root repository to bring up the application.

2. Install `pytest` with the following command (first time only):

   ```bash
   $ pip install -U pytest
   ```

3. Install local testing dependencies inside `src` folder with the following command (first time only):
   ```bash
   $ pip install requests
   ```

4. Start simulator tests inside `src` with the following command:
   ```bash
   $ pytest
   ```
