#!/bin/bash
cp /root/.ssh/authorized-keys /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
systemctl restart sshd
echo "DONE"
