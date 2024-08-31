#/bin/sh

if [ "$CI" = "true" ] ; then 
    echo 'CI build, skipping ts-node & nodemon install.'; 
else 
    echo 'Local build, installing ts-node & nodemon...';
    npm i --save-dev ts-node nodemon;
    rm -fr package-lock.json; 
fi