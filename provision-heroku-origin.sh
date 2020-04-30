#!/bin/bash

heroku apps:create ${PREFIX}-origin-sim-${STAGE}  -t ${TEAM} --region eu
heroku apps:create ${PREFIX}-origin-ui-${STAGE}  -t ${TEAM} --region eu
heroku apps:create ${PREFIX}-origin-api-${STAGE}  -t ${TEAM} --region eu

if heroku addons -a ${PREFIX}-origin-api-${STAGE} --json | grep postgresql
then 
   echo "PostgreSQL already provisioned";
else
   heroku addons:create heroku-postgresql:hobby-dev -a ${PREFIX}-origin-api-${STAGE}
fi

heroku config:set --app ${PREFIX}-origin-api-${STAGE} \
  BACKEND_PORT=433 \
  BACKEND_URL=${PREFIX}-origin-api-${STAGE}.herokuapp.com \
  EMAIL_FROM=origin-no-reply@energyweb.org \
  EMAIL_REPLY_TO=reply-to@energyweb.org \
  ISSUER_ID='Issuer ID' \
  JWT_EXPIRY_TIME='7 days' \
  REGISTRATION_MESSAGE_TO_SIGN='I register as Origin user' \
  UI_BASE_URL=https://${PREFIX}-origin-ui-${STAGE}.herokuapp.com/ \
  WEB3='https://volta-rpc-origin-0a316ab339e3d2ee3.energyweb.org' \
  DEPLOY_KEY='<KEY>' \
  EXCHANGE_ACCOUNT_DEPLOYER_PRIV='<KEY>' \
  EXCHANGE_WALLET_PRIV='<KEY>' \
  EXCHANGE_WALLET_PUB='<KEY>' \
  JWT_SECRET='<SECRET>' \
  MANDRILL_API_KEY='<KEY>'

heroku config:set --app ${PREFIX}-origin-ui-${STAGE} \
  BACKEND_PORT=433 \
  BACKEND_URL=${PREFIX}-origin-api-${STAGE}.herokuapp.com \
  ISSUER_ID='Issuer ID' \
  WEB3='https://volta-rpc-origin-0a316ab339e3d2ee3.energyweb.org' \
  DEVICE_PROPERTIES='<PROPS>'