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

## Sample commands
```

#---- run these command in your git repo folder with correct branch selected (switched) ----

pr-info -p 30102,30036 > /tmp/diff3.csv 
diffy-pkg-gen   --csv-file /tmp/diff3.csv --metadata-mapping-file ~/prs-2-xml/scripts/metadata_mapping.json --api-version 63.0 --change-types "Added,Modified,Renamed"

#------------------------------
# for deletions
diffy-pkg-gen   --csv-file /tmp/diff3.csv --metadata-mapping-file ~/prs-2-xml/scripts/metadata_mapping.json --api-version 63.0 --change-types "Deleted"

#============================================================================

## Even simpler command:

make-prs-to-pkg  30102,30036  --metadata-mapping-path ~/prs-2-xml/scripts/metadata_mapping.json 

## Find Custom Label PRS
grep -irn labels /tmp/diff3.csv | cut -f 8 -d ','

## Find Static Resource PRS
grep -irn staticresources /tmp/diff3.csv | cut -f 8 -d ','

#============================================================================


```
