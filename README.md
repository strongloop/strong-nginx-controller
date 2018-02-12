# StrongLoop Nginx Controller

Provides reverse-proxy and load-balancing support for multiple strong-pm
instances configured and run using StrongLoop Arc.

Please see the [official documentation](http://docs.strongloop.com/display/ARC).

## Install

### Prerequisite:

* You must have [Node.js](http://nodejs.org) installed.
* You must have [Nginx](http://nginx.org/) installed.

### Install using `npm` as follows:

```sh
$ npm install -g strong-nginx-controller
```

## Usage

```
usage: sl-nginx-ctl [options]

Options:
  -h,--help                 Print this message and exit.
  -v,--version              Print version and exit.
  -b,--base BASE            Base directory to work in
                              (default is .strong-nginx-controller).
  -L,--api URL              Listen at URL for API requests to this daemon
                              (default is http://0.0.0.0:8702).
  --no-api                  Disable listening for API requests.
  -C,--control URL          Connect to Central at this URL (no default).
  -R,--routable-addr ADDR   Routable ENDPOINT for incoming HTTP traffic. Nginx
                            will listen on this address and port and
                            load-balance traffic over the service endpoints
                              (default is http://0.0.0.0:8080).
  -x,--nginx                Path to Nginx binary
                              (default is /usr/sbin/nginx).
```

## Install

```
usage: sl-nginx-ctl-install [options]

Options:
  -h,--help                 Print this message and exit.
  -v,--version              Print version and exit.
  -b,--base BASE            Base directory to work in (default is
                            .strong-nginx-controller).
  -u,--user USER            User to run manager as (default is
                            strong-nginx-controller).
  -g,--group GROUP          Group to run manager as (default is
                            strong-nginx-controller).
  -L,--api URL              Listen at URL for API requests to this daemon
                            (default is http://0.0.0.0:8702).
  --no-api                  Disable listening for API requests.
  -C,--control URL          Connect to Central at this URL (no default).
  -R,--routable-addr ADDR   Routable ENDPOINT for incoming HTTP traffic. Nginx
                            will listen on this address and port and
                            load-balance traffic over the service endpoints
                            (default is http://0.0.0.0:8080).
  -d,--dry-run              Don't write any files.
  -j,--job-file FILE        Path of Upstart job to create (default is
                            /etc/init/strong-nginx-controller.conf)
  -f,--force                Overwrite existing job file if present
  -x,--nginx                Path to Nginx binary (Default: /usr/sbin/nginx)
  --upstart VERSION         Specify the version of Upstart, 1.4 or 0.6
                            (default is 1.4)
  --systemd                 Install as a systemd service, not an Upstart job.

OS Service support:
  The --systemd and --upstart VERSION options are mutually exclusive.
  If neither is specified, the service is installed as an Upstart job
  using a template that assumes Upstart 1.4 or higher.
```
