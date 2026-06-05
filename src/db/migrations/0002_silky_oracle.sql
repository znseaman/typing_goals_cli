-- ALTER TABLE "presets" ALTER COLUMN "full_details" SET DATA TYPE json;
ALTER TABLE "presets" ALTER "full_details" TYPE JSON USING to_json("full_details");