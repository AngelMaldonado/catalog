FROM ubuntu:24.04

ENV container=docker
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        openssh-server \
        sudo \
        systemd \
        systemd-sysv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd \
    && printf '%s\n' \
        'PermitRootLogin prohibit-password' \
        'PasswordAuthentication no' \
        'KbdInteractiveAuthentication no' \
        > /etc/ssh/sshd_config.d/00-sandbox.conf \
    && passwd --delete root \
    && systemctl enable ssh

STOPSIGNAL SIGRTMIN+3

CMD ["/sbin/init"]
