# replaceAll filename "from_phrase" "to_phrase"
function replaceAll() {
	regex=s/$2/$3/g
	sed -i '' "$regex" $1
}