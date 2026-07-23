# Telegram alerting

Never put real credentials in `secret.example.yaml`. Create the Secret directly from environment variables:

```bash
read -rsp 'Telegram bot token: ' TELEGRAM_BOT_TOKEN; echo
read -rp 'Telegram chat ID: ' TELEGRAM_CHAT_ID
kubectl -n monitoring create secret generic grafana-telegram \
  --from-literal=TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  --from-literal=TELEGRAM_CHAT_ID="$TELEGRAM_CHAT_ID" \
  --dry-run=client -o yaml | kubectl apply -f -
unset TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID
```

The installed chart version could not be inspected while the Kubernetes API was unreachable. Contact-point provisioning is therefore deliberately absent from `values.yaml`: Grafana provisioning syntax and the chart's Secret injection mechanism must first be checked against that version. Until then, create the Telegram contact point in Grafana, enter the Secret values, send a test notification, and route `severity=warning` and `severity=critical` alerts to it.

To rotate the bot token, revoke it with BotFather, create a replacement, recreate the Secret, update the Grafana contact point, send a test notification, and remove any local copies of the old token.
