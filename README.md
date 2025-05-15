# Installing diffy-pkg-gen

```

git clone https://github.com/mchinnappan100/nodejs-diffy-pkg-gen.git
cd nodejs-diffy-pkg-gen
 
```

## 
```
npm install
npm link
```

## Sample command

```
diffy-pkg-gen   --csv-file /tmp/diff.csv --metadata-mapping-file ~/prs-2-xml/scripts/metadata_mapping.json --api-version 63.0 --change-types "Added,Modified,Renamed"

diffy-pkg-gen   --csv-file /tmp/diff.csv --metadata-mapping-file ~/prs-2-xml/scripts/metadata_mapping.json --api-version 63.0 --change-types "Deleted"
```
